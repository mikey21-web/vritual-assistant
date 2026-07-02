from __future__ import annotations

import asyncio
import uuid
from typing import Any

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

from app.config import Settings
from app.schemas import AgentState
from app.backend_client import BackendClient, BackendError
from app.niche_config import normalize_niche_config, load_niche_config_from_file
from app.prompt import build_system_prompt
from app.logging_config import utc_now_iso

import structlog

logger = structlog.get_logger()

MAX_HISTORY_MESSAGES = 20


def build_graph(tools: list, settings: Settings, client: BackendClient):
    graph = StateGraph(AgentState)

    graph.add_node("load_context", _load_context)
    graph.add_node("agent", _agent_node)
    graph.add_node("tools", ToolNode(tools))
    graph.add_node("persist", _persist_node)

    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "agent")
    graph.add_conditional_edges(
        "agent",
        _should_continue,
        {"tools": "tools", "persist": "persist"},
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("persist", END)

    return graph.compile()


async def _load_context(state: AgentState, config: dict) -> AgentState:
    client: BackendClient = config["configurable"]["client"]

    lead_id = state["lead_id"]
    nich = state.get("niche_config")

    try:
        lead, conversations = await asyncio.gather(
            client._get(f"/leads/{lead_id}"),
            client._get(f"/leads/{lead_id}/conversations"),
        )
        niche_raw = load_niche_config_from_file()
    except BackendError as e:
        if e.status in (401, 403):
            logger.error("load_context_auth_failed", status=e.status, endpoint=e.endpoint)
            raise
        logger.error("load_context_failed", error=str(e))
        lead = {"id": lead_id, "status": "NEW", "score": 0, "segment": "COLD", "contact": {}}
        conversations = []
        niche_raw = {}
    except Exception as e:
        logger.error("load_context_failed", error=str(e))
        lead = {"id": lead_id, "status": "NEW", "score": 0, "segment": "COLD", "contact": {}}
        conversations = []
        niche_raw = {}

    if not nich:
        nich = normalize_niche_config(niche_raw)

    prior_messages: list[dict] = []
    messages_list = conversations if isinstance(conversations, list) else conversations.get("data", [])
    for msg in messages_list[-MAX_HISTORY_MESSAGES:]:
        role = "user" if msg.get("direction") == "INBOUND" else "assistant"
        prior_messages.append({"role": role, "text": msg.get("text", "")})

    system_prompt = build_system_prompt(nich, lead)

    lc_messages: list[Any] = [SystemMessage(content=system_prompt)]
    for pm in prior_messages:
        if pm["role"] == "user":
            lc_messages.append(HumanMessage(content=pm["text"]))
        else:
            lc_messages.append(AIMessage(content=pm["text"]))

    incoming = state.get("incoming_text")
    if incoming:
        lc_messages.append(HumanMessage(content=incoming))
    elif state.get("trigger") == "lead_created":
        lc_messages.append(HumanMessage(content="A new lead was created. Introduce yourself and start the conversation."))
    else:
        lc_messages.append(HumanMessage(content="Check in with the lead."))

    state["lead_context"] = lead
    state["conversation"] = prior_messages
    state["niche_config"] = nich
    state["messages"] = lc_messages
    state["steps"] = 0
    state["actions_taken"] = []
    state["terminate"] = False

    return state


async def _agent_node(state: AgentState, config: dict) -> AgentState:
    settings: Settings = config["configurable"]["settings"]

    tools = config["configurable"]["tools"]

    model = ChatAnthropic(
        model=settings.agent_model,
        max_tokens=settings.agent_max_tokens,
        anthropic_api_key=settings.anthropic_api_key,
    ).bind_tools(tools)

    response = await model.ainvoke(state["messages"])
    state["messages"].append(response)
    state["steps"] = state.get("steps", 0) + 1

    if hasattr(response, "tool_calls") and response.tool_calls:
        for tc in response.tool_calls:
            state["actions_taken"].append({
                "id": tc.get("id", ""),
                "tool": tc.get("name", ""),
                "args": tc.get("args", {}),
                "status": "pending",
            })

    return state


def _should_continue(state: AgentState, config: dict) -> str:
    messages = state.get("messages", [])
    settings: Settings = config["configurable"]["settings"]
    max_steps = settings.max_agent_steps

    if state.get("terminate"):
        return "persist"

    if state.get("steps", 0) >= max_steps:
        return "persist"

    if messages:
        last = messages[-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            for tc in last.tool_calls:
                name = tc.get("name", "")
                if name in ("escalate_to_human", "mark_lost"):
                    state["terminate"] = True
                    return "persist"

                send_count = sum(1 for a in state.get("actions_taken", []) if a.get("tool") == "send_message")
                if name == "send_message" and send_count >= 2:
                    state["terminate"] = True
                    return "persist"

            return "tools"

    return "persist"


async def _persist_node(state: AgentState, config: dict) -> AgentState:
    client: BackendClient = config["configurable"]["client"]
    settings: Settings = config["configurable"]["settings"]
    run_id = state.get("run_id", str(uuid.uuid4()))

    # Resolve tool execution results from ToolMessages
    actions = state.get("actions_taken", [])
    messages = state.get("messages", [])
    resolved_actions = []
    for act in actions:
        result_status = act.get("status", "called")
        if result_status == "pending":
            for mi in range(len(messages) - 1, -1, -1):
                if isinstance(messages[mi], ToolMessage) and messages[mi].tool_call_id == act.get("id"):
                    result_status = "success" if not (hasattr(messages[mi], "content") and str(messages[mi].content).startswith("error:")) else "error"
                    break
        resolved_actions.append({**act, "status": result_status})

    started_at = state.get("started_at", utc_now_iso())

    try:
        await client.post_run_summary({
            "runId": run_id,
            "leadId": state["lead_id"],
            "actions": resolved_actions,
            "model": settings.agent_model,
            "startedAt": started_at,
            "finishedAt": utc_now_iso(),
        })
    except Exception as e:
        logger.warning("persist_failed", error=str(e))

    return state
