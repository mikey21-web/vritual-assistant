from __future__ import annotations

import uuid
from typing import Literal

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.postgres import PostgresSaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.runnables import RunnableConfig

from app.config import Settings
from app.schemas import SharedMikeyState
from app.backend_client import BackendClient
from app.memory_client import MemoryClient, MemoryEntry
from app.operator_agent import build_operator_tools
from app.prompt_supervisor import build_supervisor_prompt
from app.logging_config import utc_now_iso

import structlog

logger = structlog.get_logger()


def build_supervisor(
    settings: Settings,
    client: BackendClient,
    tenant_id: str,
    memory: MemoryClient | None = None,
    checkpointer: PostgresSaver | None = None,
):
    graph = StateGraph(SharedMikeyState)

    operator_tools = build_operator_tools(client, tenant_id)

    model = ChatOpenAI(
        model=settings.agent_model,
        max_tokens=settings.agent_max_tokens,
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )

    model_with_tools = model.bind_tools(operator_tools)

    high_impact_tools = {"send_message", "create_campaign", "initiate_call", "send_email", "bulk_send_message"}

    agent_tools_node = ToolNode(operator_tools)

    async def supervisor_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        system_prompt = build_supervisor_prompt(state)

        messages = [SystemMessage(content=system_prompt)]
        if state.get("memory_context"):
            messages.append(SystemMessage(content=f"Memory context:\n{state['memory_context']}"))

        for m in state.get("messages", []):
            messages.append(m)

        response = await model_with_tools.ainvoke(messages)

        new_messages = [response]
        actions_taken = state.get("actions_taken", [])
        steps = state.get("steps", 0) + 1

        if hasattr(response, "tool_calls") and response.tool_calls:
            for tc in response.tool_calls:
                name = tc.get("name", "") if isinstance(tc, dict) else tc.name
                args = tc.get("args", {}) if isinstance(tc, dict) else tc.args
                actions_taken.append({
                    "id": tc.get("id", str(uuid.uuid4())) if isinstance(tc, dict) else tc.id,
                    "tool": name,
                    "args": args,
                    "status": "pending",
                    "requires_confirmation": name in high_impact_tools,
                })

        return {
            "messages": new_messages,
            "actions_taken": actions_taken,
            "steps": steps,
            "next_agent": "supervisor",
        }

    async def load_context_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        lead_id = state.get("lead_id")

        try:
            lead = await client._get(f"/leads/{lead_id}")
            conversations = await client._get(f"/leads/{lead_id}/conversations")
        except Exception:
            lead = {"id": lead_id, "status": "NEW", "score": 0, "segment": "COLD", "contact": {}}
            conversations = []

        memory_context = ""
        if memory and lead_id:
            try:
                memory_context = await memory.get_context_for_lead(lead_id)
            except Exception:
                pass

        prior_messages: list[BaseMessage] = []
        messages_list = conversations if isinstance(conversations, list) else conversations.get("data", [])
        for msg in messages_list[-20:]:
            role = "user" if msg.get("direction") == "INBOUND" else "assistant"
            if role == "user":
                prior_messages.append(HumanMessage(content=msg.get("text", "")))
            else:
                prior_messages.append(AIMessage(content=msg.get("text", "")))

        incoming = state.get("incoming_text")
        if incoming:
            prior_messages.append(HumanMessage(content=incoming))
        elif state.get("trigger") == "lead_created":
            prior_messages.append(HumanMessage(content="A new lead was created. Qualify and respond."))
        elif not prior_messages:
            prior_messages.append(HumanMessage(content="Check in with the lead."))

        return {
            "lead_context": lead,
            "messages": prior_messages,
            "memory_context": memory_context,
            "conversation": messages_list[-20:] if isinstance(messages_list, list) else [],
            "steps": 0,
            "actions_taken": [],
            "terminate": False,
        }

    async def persist_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        actions = state.get("actions_taken", [])
        messages = state.get("messages", [])

        resolved = []
        has_send = False
        for act in actions:
            status = act.get("status", "pending")
            if status == "pending" and messages:
                for m in reversed(messages):
                    if isinstance(m, ToolMessage) and m.tool_call_id == act.get("id"):
                        status = "success" if not str(m.content).startswith("error:") else "error"
                        break
            if act.get("tool") == "send_message" and status == "success":
                has_send = True
            resolved.append({**act, "status": status})

        if not has_send and messages:
            for m in reversed(messages):
                if isinstance(m, AIMessage) and m.content and not getattr(m, "tool_calls", None):
                    try:
                        await client.send_message(state["lead_id"], state.get("channel", "WHATSAPP"), str(m.content), None)
                        resolved.append({"tool": "send_message", "status": "auto"})
                    except Exception:
                        pass
                    break

        try:
            await client.post_run_summary({
                "runId": state.get("run_id", str(uuid.uuid4())),
                "leadId": state["lead_id"],
                "actions": resolved,
                "model": settings.agent_model,
                "startedAt": state.get("started_at", utc_now_iso()),
                "finishedAt": utc_now_iso(),
            })
        except Exception:
            pass

        if memory and state.get("messages"):
            ai_msgs = [m for m in state["messages"] if isinstance(m, AIMessage) and m.content]
            if ai_msgs:
                summary = f"## Agent Conversation\n- Lead: {state['lead_id']}\n"
                for m in ai_msgs[-3:]:
                    summary += f"- {str(m.content)[:200]}\n"
                await memory.store(MemoryEntry(
                    type="EPISODIC",
                    key=f"conversation:{state['lead_id']}:{utc_now_iso()}",
                    value=summary,
                    source="supervisor",
                    lead_id=state["lead_id"],
                ))

        return state

    def should_continue(state: SharedMikeyState) -> Literal["tools", END]:
        messages = state.get("messages", [])
        steps = state.get("steps", 0)

        if state.get("terminate") or steps >= settings.max_agent_steps:
            return END

        if messages:
            last = messages[-1]
            if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
                for tc in last.tool_calls:
                    name = tc.get("name", "") if isinstance(tc, dict) else tc.name
                    if name in ("escalate_to_human", "mark_lost"):
                        state["terminate"] = True
                        return END
                    send_count = sum(1 for a in state.get("actions_taken", []) if a.get("tool") == "send_message" and a.get("status") == "success")
                    if name == "send_message" and send_count >= 5:
                        state["terminate"] = True
                        return END
                return "tools"

        return END

    graph.add_node("load_context", load_context_node)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("tools", agent_tools_node)
    graph.add_node("persist", persist_node)

    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "supervisor")
    graph.add_conditional_edges("supervisor", should_continue, {"tools": "tools", END: "persist"})
    graph.add_edge("tools", "supervisor")
    graph.add_edge("persist", END)

    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["tools"] if checkpointer else None,
    )

    return compiled
