from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException, Header

from app.config import Settings
from app.schemas import AgentRunRequest, AgentRunResponse, CopilotChatRequest, CopilotChatResponse
from app.runner import execute_run
from app.copilot import run_copilot_chat
from app.backend_client import BackendClient
from app.idempotency import init as idempotency_init, close as idempotency_close
from app.logging_config import setup_logging, new_run_id

import httpx
import structlog

logger = structlog.get_logger()
settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await idempotency_init(settings.redis_url)

    if not settings.agent_inbound_key:
        logger.error("agent_inbound_key_not_set", help="Set AGENT_INBOUND_KEY in environment")
        sys.exit(1)

    if not settings.deepseek_api_key:
        logger.error("deepseek_api_key_not_set", help="Set DEEPSEEK_API_KEY in environment")
        sys.exit(1)

    logger.info("agent_service_started", model=settings.agent_model)
    yield
    await idempotency_close()
    logger.info("agent_service_stopped")


app = FastAPI(title="AI Lead Agent Service", version="1.0.0", lifespan=lifespan)


async def _retry_execute_run(settings: Settings, req: AgentRunRequest) -> None:
    """Run execute_run with a single retry on failure."""
    try:
        await execute_run(settings, req)
    except Exception:
        logger.exception("execute_run_failed_first_attempt", lead_id=req.lead_id)
        try:
            await asyncio.sleep(2)
            await execute_run(settings, req)
        except Exception:
            logger.exception("execute_run_failed_retry", lead_id=req.lead_id)


@app.post("/agent/run", response_model=AgentRunResponse, status_code=202)
async def agent_run(req: AgentRunRequest, background_tasks: BackgroundTasks, x_agent_key: str = Header(None)):
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")

    run_id = new_run_id()

    background_tasks.add_task(_retry_execute_run, settings, req)

    return AgentRunResponse(accepted=True, runId=run_id)


@app.post("/copilot/run", response_model=CopilotChatResponse)
async def copilot_run(req: CopilotChatRequest, x_agent_key: str = Header(None)):
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")

    client = BackendClient(settings)
    try:
        result = await run_copilot_chat(settings, client, [m.model_dump() for m in req.messages], req.leadId)
    except Exception:
        logger.exception("copilot_run_failed")
        raise HTTPException(status_code=502, detail="Copilot failed to respond")
    finally:
        await client.close()

    return CopilotChatResponse(reply=result["reply"], actions=result["actions"])


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/deep")
async def health_deep(x_agent_key: str = Header(None)):
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")
    checks = {}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{settings.backend_api_url.rstrip('/')}/health")
            checks["backend"] = "ok" if r.status_code == 200 else f"HTTP {r.status_code}"
    except Exception as e:
        checks["backend"] = f"error: {e}"

    checks["model_key_present"] = bool(settings.deepseek_api_key)
    checks["model"] = settings.agent_model

    return {
        "status": "ok" if checks.get("backend") == "ok" and checks["model_key_present"] else "degraded",
        "checks": checks,
    }
