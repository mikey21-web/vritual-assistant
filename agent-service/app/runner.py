from __future__ import annotations

import uuid as _uuid

import structlog

from app.config import Settings
from app.schemas import AgentRunRequest, AgentState
from app.backend_client import BackendClient
from app.graph import build_graph
from app.tools import build_tools, ToolContext
from app.logging_config import utc_now_iso
from app.idempotency import already_processed, mark_processing, mark_done

logger = structlog.get_logger()


async def execute_run(settings: Settings, req: AgentRunRequest) -> str:
    run_id = req.triggerId or str(_uuid.uuid4())
    started_at = utc_now_iso()

    if await already_processed(req.triggerId):
        logger.info("run_skipped_duplicate", triggerId=req.triggerId)
        return run_id

    acquired = await mark_processing(req.triggerId)
    if not acquired:
        logger.info("run_skipped_concurrent", triggerId=req.triggerId)
        return run_id
    logger.info("run_started", leadId=req.leadId, trigger=req.trigger)

    client = BackendClient(settings)

    ctx = ToolContext(client=client, lead_id=req.leadId, tenant_id=req.tenantId)
    tools = build_tools(ctx)

    graph = build_graph(tools=tools, settings=settings, client=client)

    initial_state: AgentState = {
        "tenant_id": req.tenantId,
        "lead_id": req.leadId,
        "trigger_id": req.triggerId,
        "channel": req.channel,
        "trigger": req.trigger,
        "incoming_text": req.messageText,
        "run_id": run_id,
        "started_at": started_at,
    }

    try:
        config = {
            "configurable": {
                "settings": settings,
                "client": client,
                "tools": tools,
            },
        }
        await graph.ainvoke(initial_state, config)
        logger.info("run_completed", leadId=req.leadId)
    except Exception as e:
        logger.error("run_failed", error=str(e), leadId=req.leadId)
    finally:
        await mark_done(req.triggerId)
        await client.close()

    return run_id
