from __future__ import annotations

import uuid as _uuid

import structlog
from langchain_core.messages import AIMessage

from app.config import Settings
from app.schemas import AgentRunRequest, AgentState
from app.backend_client import BackendClient
from app.graph import build_graph
from app.tools import build_tools, ToolContext
from app.logging_config import utc_now_iso
from app.idempotency import already_processed, mark_processing, mark_done

logger = structlog.get_logger()

FALLBACK_REPLY = "Sorry, I'm having trouble right now — let's continue this over text."


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

    ctx = ToolContext(client=client, lead_id=req.leadId, tenant_id=req.tenantId, channel=req.channel)
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
                "ctx": ctx,
            },
        }
        await graph.ainvoke(initial_state, config)
        logger.info("run_completed", leadId=req.leadId)
        await mark_done(req.triggerId, success=True)
    except Exception as e:
        logger.error("run_failed", error=str(e), leadId=req.leadId)
        await mark_done(req.triggerId, success=False)
    finally:
        await client.close()

    return run_id


async def execute_run_sync(settings: Settings, req: AgentRunRequest) -> dict:
    """Like execute_run, but awaits the graph fully and returns the assistant's
    reply text (and whether it ended the conversation) instead of firing a
    background task. Used by channels — voice, specifically — that need the
    reply in the same request/response round trip rather than delivered
    asynchronously through a channel adapter."""
    run_id = req.triggerId or str(_uuid.uuid4())
    started_at = utc_now_iso()

    if await already_processed(req.triggerId):
        logger.info("sync_run_skipped_duplicate", triggerId=req.triggerId)
        return {"reply": FALLBACK_REPLY, "terminate": False}

    acquired = await mark_processing(req.triggerId)
    if not acquired:
        logger.info("sync_run_skipped_concurrent", triggerId=req.triggerId)
        return {"reply": FALLBACK_REPLY, "terminate": False}

    client = BackendClient(settings)
    ctx = ToolContext(client=client, lead_id=req.leadId, tenant_id=req.tenantId, channel=req.channel)
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

    reply = FALLBACK_REPLY
    terminate = False
    try:
        config = {
            "configurable": {
                "settings": settings,
                "client": client,
                "tools": tools,
                "ctx": ctx,
            },
        }
        final_state = await graph.ainvoke(initial_state, config)
        terminate = bool(final_state.get("terminate", False))
        for m in reversed(final_state.get("messages", [])):
            if isinstance(m, AIMessage) and m.content:
                reply = str(m.content)
                break
        logger.info("sync_run_completed", leadId=req.leadId, terminate=terminate)
        await mark_done(req.triggerId, success=True)
    except Exception as e:
        logger.error("sync_run_failed", error=str(e), leadId=req.leadId)
        await mark_done(req.triggerId, success=False)
    finally:
        await client.close()

    return {"reply": reply, "terminate": terminate}
