from __future__ import annotations

import asyncio
import uuid
from typing import Literal

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.runnables import RunnableConfig

from app.config import Settings
from app.schemas import SharedMikeyState, AgentState
from app.backend_client import BackendClient
from app.memory_client import MemoryClient, MemoryEntry
from app.lead_agent import build_lead_graph
from app.operator_agent import build_operator_tools
from app.tools import build_tools, ToolContext
from app.prompt_copilot import build_copilot_prompt
from app.prompt_supervisor import build_supervisor_prompt
from app.logging_config import utc_now_iso

import structlog

logger = structlog.get_logger()


def build_supervisor(
    settings: Settings,
    client: BackendClient,
    tenant_id: str,
    memory: MemoryClient | None = None,
    checkpointer=None,
):
    graph = StateGraph(SharedMikeyState)

    model = ChatOpenAI(
        model=settings.agent_model,
        max_tokens=settings.agent_max_tokens,
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )

    async def load_context_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        if state.get("trigger") == "copilot_chat":
            return {
                "lead_context": {},
                "messages": state.get("messages", []),
                "memory_context": state.get("copilot_context", {}).get("memory_context", ""),
                "procedural_rules": [],
                "niche_benchmarks": [],
                "conversation": [],
                "next_agent": "operator_voice",
                "steps": 0,
                "actions_taken": [],
                "terminate": False,
            }

        lead_id = state.get("lead_id")

        try:
            lead, conversations = await asyncio.gather(
                client._get(f"/leads/{lead_id}"),
                client._get(f"/leads/{lead_id}/conversations"),
            )
        except Exception:
            lead = {"id": lead_id, "status": "NEW", "score": 0, "segment": "COLD", "contact": {}}
            conversations = []

        memory_context = ""
        if memory and lead_id:
            try:
                memory_context = await memory.get_context_for_lead(lead_id)
            except Exception:
                pass

        incoming_context = state.get("incoming_text", "")

        procedural_rules = []
        if memory:
            try:
                if incoming_context:
                    procedural_rules = await memory.get_relevant_rules(incoming_context, max_rules=5)
                else:
                    procedural_rules = await memory.get_active_rules()
            except Exception:
                pass

        benchmarks = []
        if memory and incoming_context:
            try:
                benchmarks = await memory.get_benchmarks("")
            except Exception:
                pass

        prior_messages: list[BaseMessage] = []
        messages_list = conversations if isinstance(conversations, list) else conversations.get("data", [])
        for msg in messages_list[-20:]:
            role = "user" if msg.get("direction") == "INBOUND" else "assistant"
            prior_messages.append(HumanMessage(content=msg.get("text", "")) if role == "user" else AIMessage(content=msg.get("text", "")))

        incoming = state.get("incoming_text")
        if incoming:
            prior_messages.append(HumanMessage(content=incoming))
        elif state.get("trigger") == "lead_created":
            prior_messages.append(HumanMessage(content="A new lead was created. Qualify and respond."))
        elif not prior_messages:
            prior_messages.append(HumanMessage(content="Check in with the lead."))

        trigger = state.get("trigger", "")
        is_staff_request = trigger in ("copilot_chat", "dashboard_query", "staff_request") or (
            incoming and not state.get("lead_id")
        )

        return {
            "lead_context": lead,
            "messages": prior_messages,
            "memory_context": memory_context,
            "procedural_rules": procedural_rules,
            "niche_benchmarks": benchmarks,
            "conversation": messages_list[-20:] if isinstance(messages_list, list) else [],
            "next_agent": "operator_voice" if is_staff_request else "lead_voice",
            "steps": 0,
            "actions_taken": [],
            "terminate": False,
        }

    async def lead_voice_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        ctx = ToolContext(client=client, lead_id=state["lead_id"], tenant_id=tenant_id, channel=state.get("channel", "WHATSAPP"))
        tools = build_tools(ctx)
        sub_graph = build_lead_graph(tools=tools, settings=settings, client=client)

        sub_state: AgentState = {
            "tenant_id": state["tenant_id"],
            "lead_id": state["lead_id"],
            "trigger_id": state.get("trigger_id", ""),
            "channel": state.get("channel", "WHATSAPP"),
            "trigger": state.get("trigger", ""),
            "incoming_text": state.get("incoming_text"),
            "run_id": state.get("run_id", str(uuid.uuid4())),
            "started_at": state.get("started_at", utc_now_iso()),
            "lead_context": state.get("lead_context", {}),
            "conversation": state.get("conversation", []),
            "niche_config": state.get("niche_config", {}),
        }

        sub_config = {
            "configurable": {
                "settings": settings,
                "client": client,
                "tools": tools,
                "ctx": ctx,
            },
        }

        final_sub_state = await sub_graph.ainvoke(sub_state, sub_config)

        return {
            "messages": final_sub_state.get("messages", state.get("messages", [])),
            "actions_taken": final_sub_state.get("actions_taken", state.get("actions_taken", [])),
            "steps": (state.get("steps", 0) + final_sub_state.get("steps", 0)),
            "terminate": final_sub_state.get("terminate", False),
        }

    async def operator_voice_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        operator_tools = build_operator_tools(client, tenant_id)
        agent_tools_node = ToolNode(operator_tools)
        model_with_tools = model.bind_tools(operator_tools)

        if state.get("trigger") == "copilot_chat":
            copilot_ctx = state.get("copilot_context") or {}
            system_prompt = build_copilot_prompt(
                business_name=copilot_ctx.get("business_name", "this business"),
                industry=copilot_ctx.get("industry", ""),
                tone_examples=copilot_ctx.get("tone_examples"),
                goals=copilot_ctx.get("goals"),
                compliance=copilot_ctx.get("compliance"),
                memory_context=state.get("memory_context", ""),
                benchmark_context=copilot_ctx.get("benchmark_context", ""),
                khoj_context=copilot_ctx.get("khoj_context", ""),
            )
        else:
            system_prompt = build_supervisor_prompt(state)

        messages = [SystemMessage(content=system_prompt)]
        if state.get("memory_context"):
            messages.append(SystemMessage(content=f"Memory context:\n{state['memory_context']}"))
        if state.get("procedural_rules"):
            rules_text = "\n".join(
                f"- {r.get('rule', r.get('value', ''))} (category: {r.get('category', 'general')}, score: {r.get('score', 'N/A')})"
                if r.get('score') else f"- {r.get('rule', r.get('value', ''))} (category: {r.get('category', 'general')})"
                for r in state["procedural_rules"]
            )
            messages.append(SystemMessage(content=f"Active learned rules (follow these, highest relevance first):\n{rules_text}"))

        if state.get("niche_benchmarks"):
            bench = state["niche_benchmarks"]
            if isinstance(bench, list) and len(bench) > 0:
                bench_text = "\n".join(
                    f"- {b.get('metric', '')}: avg {b.get('avgValue', '?')} (p50: {b.get('p50', '?')}, sample: {b.get('sampleSize', '?')} peers)"
                    for b in bench[:5]
                )
                messages.append(SystemMessage(content=f"Market benchmarks (use for advice):\n{bench_text}"))

        for m in state.get("messages", []):
            messages.append(m)

        high_impact_tools = {"send_message", "create_campaign", "initiate_call", "send_email", "bulk_send_message", "define_outcome"}

        actions_taken = state.get("actions_taken", [])
        steps = 0

        while steps < settings.max_agent_steps:
            steps += 1
            response = await model_with_tools.ainvoke(messages)
            messages.append(response)

            if hasattr(response, "tool_calls") and response.tool_calls:
                should_terminate = False
                for tc in response.tool_calls:
                    name = tc.get("name", "") if isinstance(tc, dict) else tc.name
                    args = tc.get("args", {}) if isinstance(tc, dict) else tc.args

                    if name in ("escalate_to_human", "mark_lost"):
                        should_terminate = True
                        break

                    if name in high_impact_tools:
                        actions_taken.append({
                            "id": tc.get("id", str(uuid.uuid4())) if isinstance(tc, dict) else tc.id,
                            "tool": name,
                            "args": args,
                            "status": "pending_confirmation",
                        })
                        messages.append(ToolMessage(
                            content=f"pending confirmation: {name} requires human approval",
                            tool_call_id=tc.get("id", "") if isinstance(tc, dict) else tc.id,
                        ))
                        should_terminate = True
                        break

                if should_terminate:
                    break

                tool_results = await agent_tools_node.ainvoke({"messages": messages})
                for msg in tool_results.get("messages", []):
                    messages.append(msg)
                    actions_taken.append({
                        "id": getattr(msg, "tool_call_id", str(uuid.uuid4())),
                        "tool": "operator_tool",
                        "args": {},
                        "status": "success" if not str(getattr(msg, "content", "")).startswith("error:") else "error",
                    })
            else:
                break

        return {
            "messages": messages,
            "actions_taken": actions_taken,
            "steps": steps,
        }

    async def persist_node(state: SharedMikeyState, config: RunnableConfig) -> dict:
        if state.get("trigger") == "copilot_chat":
            return state

        actions = state.get("actions_taken", [])
        messages = state.get("messages", [])

        resolved = []
        has_send = False
        for act in actions:
            status = act.get("status", "pending")
            if status == "pending" and messages:
                for m in reversed(messages):
                    if isinstance(m, ToolMessage) and getattr(m, "tool_call_id", None) == act.get("id"):
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

        if memory and messages:
            ai_msgs = [m for m in messages if isinstance(m, AIMessage) and m.content]
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

    def should_continue(state: SharedMikeyState) -> Literal["lead_voice", "operator_voice", "persist", END]:
        if state.get("terminate") or state.get("steps", 0) >= settings.max_agent_steps:
            return "persist"

        next_agent = state.get("next_agent")
        if next_agent == "lead_voice":
            return "lead_voice"
        if next_agent == "operator_voice":
            return "operator_voice"

        return "persist"

    graph.add_node("load_context", load_context_node)
    graph.add_node("lead_voice", lead_voice_node)
    graph.add_node("operator_voice", operator_voice_node)
    graph.add_node("persist", persist_node)

    graph.set_conditional_entry_point(
        should_continue,
        {
            "lead_voice": "lead_voice",
            "operator_voice": "operator_voice",
            "persist": "persist",
        },
    )

    graph.add_edge("lead_voice", "persist")
    graph.add_edge("operator_voice", "persist")
    graph.add_edge("persist", END)

    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["operator_voice"] if checkpointer else None,
    )

    return compiled
