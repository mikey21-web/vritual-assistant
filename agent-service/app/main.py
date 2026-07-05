from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException, Header

from app.config import Settings
from app.schemas import AgentRunRequest, AgentRunResponse
from app.runner import execute_run
from app.config_runtime import runtime_config
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


@app.post("/agent/config")
async def agent_config(body: dict, x_agent_key: str = Header(None)):
    """Receive agent config from the NestJS backend dashboard."""
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")

    from app.config_runtime import runtime_config as rc

    rc.update(body)
    logger.info("agent_config_updated", keys=list(body.keys()))
    return {"status": "ok", "accepted": list(body.keys())}


@app.get("/agent/config")
async def agent_get_config(x_agent_key: str = Header(None)):
    """Return the current runtime agent config."""
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")
    return runtime_config


@app.post("/agent/test")
async def agent_test(body: dict, x_agent_key: str = Header(None)):
    """Test endpoint that returns a response without running full agent."""
    if settings.agent_inbound_key and x_agent_key != settings.agent_inbound_key:
        raise HTTPException(status_code=401, detail="Invalid agent key")

    # Return a contextual response based on config if available
    biz_name = runtime_config.get("businessName", "our service")
    industry = runtime_config.get("industry", "this space")
    tone = runtime_config.get("toneStyle", "professional")

    questions = runtime_config.get("qualificationQuestions", [])
    question_hint = ""
    if questions:
        question_hint = f" You might want to ask about {questions[0].lower()}."

    return {
        "response": f"Thanks for reaching out! I'm the AI assistant for {biz_name} ({industry}). I can help answer your questions, qualify your needs, and schedule a consultation.{question_hint} What can I help you with today?",
        "config": {"tone": tone, "businessName": biz_name},
    }
