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


async def execute_run_and_get_response(settings: Settings, req: AgentRunRequest) -> str:
    """Run the agent synchronously and return the last AI response text."""
    run_id = req.triggerId or str(_uuid.uuid4())
    started_at = utc_now_iso()

    client = BackendClient(settings)
    response_text = ""

    try:
        ctx = ToolContext(client=client, lead_id=req.leadId, tenant_id=req.tenantId, channel=req.channel)
        tools = build_tools(ctx)

        # Wrap send_message to capture last response
        original_send = None
        for t in tools:
            if t.name == "send_message":
                original_send = t
                break

        if original_send:
            async def send_message_wrapper(message_text: str) -> str:
                nonlocal response_text
                response_text = message_text
                return await original_send.coroutine(message_text)

            import langchain_core.tools as lc_tools
            for i, t in enumerate(tools):
                if t.name == "send_message":
                    tools[i] = lc_tools.StructuredTool(
                        name="send_message",
                        description=t.description,
                        coroutine=send_message_wrapper,
                    )

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

        config = {
            "configurable": {
                "settings": settings,
                "client": client,
                "tools": tools,
            },
        }
        final_state = await graph.ainvoke(initial_state, config)

        # If the tool wrapper didn't capture it, try to get from state
        if not response_text and final_state:
            messages = final_state.get("messages", [])
            for msg in reversed(messages):
                if hasattr(msg, "type") and msg.type == "ai" and msg.content:
                    response_text = msg.content
                    break

        if not response_text:
            response_text = "Thanks for reaching out! I'm here to help. What can I assist you with today?"

        logger.info("sync_chat_completed", leadId=req.leadId, response_len=len(response_text))
        return response_text

    except Exception as e:
        logger.error("sync_chat_failed", error=str(e), leadId=req.leadId)
        return "I appreciate your patience! Let me connect you with a team member who can help."
    finally:
        await client.close()
