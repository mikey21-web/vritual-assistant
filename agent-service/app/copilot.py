from __future__ import annotations

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

from app.config import Settings
from app.backend_client import BackendClient
from app.copilot_tools import build_copilot_tools

import structlog

logger = structlog.get_logger()

MAX_COPILOT_STEPS = 6

COPILOT_SYSTEM_PROMPT = """You are the internal AI copilot for the business owner and team using this CRM \
— their assistant for running the system itself, not for talking to leads.

You can look up leads, summarize business performance, draft messages, create tasks, and send messages
on the owner's behalf when they explicitly ask you to.

RULES:
- If asked to draft or write a message, just write it as your own reply — do NOT call send_message_to_lead
  unless the owner has clearly confirmed sending it (e.g. "send it", "yes send that"). Never send on a first ask.
- Use list_leads / get_lead_detail / get_business_summary to ground answers in real data — never guess names,
  counts, or numbers.
- Be concise. This is a chat interface, not a report.
- If you don't have enough information to answer, say so plainly instead of fabricating an answer."""


async def run_copilot_chat(settings: Settings, client: BackendClient, messages: list[dict], lead_id: str | None = None) -> dict:
    if not settings.deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not configured — copilot cannot run")

    tools = build_copilot_tools(client)
    tools_by_name = {t.name: t for t in tools}
    model = ChatOpenAI(
        model=settings.agent_model,
        max_tokens=settings.agent_max_tokens,
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    ).bind_tools(tools)

    lc_messages: list = [SystemMessage(content=COPILOT_SYSTEM_PROMPT)]
    if lead_id:
        lc_messages.append(SystemMessage(content=f"The owner opened this chat from lead {lead_id} — assume questions are about this lead unless they say otherwise."))
    for m in messages:
        if m.get("role") == "user":
            lc_messages.append(HumanMessage(content=m.get("text", "")))
        else:
            lc_messages.append(AIMessage(content=m.get("text", "")))

    actions: list[dict] = []

    for _ in range(MAX_COPILOT_STEPS):
        response = await model.ainvoke(lc_messages)
        lc_messages.append(response)

        tool_calls = getattr(response, "tool_calls", None)
        if not tool_calls:
            return {"reply": response.content or "", "actions": actions}

        for tc in tool_calls:
            tool_fn = tools_by_name.get(tc["name"])
            if not tool_fn:
                result = f"error: unknown tool {tc['name']}"
            else:
                try:
                    result = await tool_fn.ainvoke(tc["args"])
                except Exception as e:
                    logger.warning("copilot_tool_failed", tool=tc["name"], error=str(e))
                    result = f"error: {e}"
            actions.append({"tool": tc["name"], "args": tc["args"], "status": "success" if str(result).startswith("ok:") else "error"})
            lc_messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return {"reply": "I wasn't able to finish that within my step limit — try breaking it into a smaller question.", "actions": actions}
