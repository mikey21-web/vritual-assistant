from __future__ import annotations

from langchain_core.tools import tool
from app.backend_client import BackendClient, BackendError


def _ok(msg: str) -> str:
    return f"ok: {msg}"


def _err(msg: str) -> str:
    return f"error: {msg}"


def build_copilot_tools(client: BackendClient) -> list:
    @tool
    async def list_leads(filter: str = "all"):
        """List leads for the business owner. filter: 'hot' (HOT segment), 'unassigned', or 'all' (most recent). Returns up to 15 leads with name, status, segment, score, and id."""
        try:
            params: dict = {}
            if filter == "hot":
                params["segment"] = "HOT"
            result = await client.list_leads(params)
            leads = result.get("data", []) if isinstance(result, dict) else result
            if filter == "unassigned":
                leads = [lead for lead in leads if not lead.get("assignedAgentId")]
            if not leads:
                return _ok("no matching leads found")
            lines = [
                f"- {(lead.get('contact') or {}).get('name', 'Unknown')} | status={lead.get('status')} segment={lead.get('segment')} score={lead.get('score')} id={lead.get('id')}"
                for lead in leads[:15]
            ]
            return _ok("\n" + "\n".join(lines))
        except BackendError as e:
            return _err(str(e))

    @tool
    async def get_lead_detail(lead_id: str):
        """Get full detail on one lead: contact info, status, score, and recent conversation history. Use this before answering questions about a specific lead."""
        try:
            lead = await client.get_lead(lead_id)
            convo = await client.get_conversation(lead_id)
            messages = convo if isinstance(convo, list) else convo.get("data", [])
            recent = messages[-6:]
            convo_text = "\n".join(f"  [{m.get('direction')}] {m.get('text')}" for m in recent)
            contact = lead.get("contact") or {}
            return _ok(
                f"{contact.get('name', 'Unknown')} ({contact.get('phone') or contact.get('email') or 'no contact info'})\n"
                f"status={lead.get('status')} segment={lead.get('segment')} score={lead.get('score')}\n"
                f"Recent conversation:\n{convo_text or '  (none yet)'}"
            )
        except BackendError as e:
            return _err(str(e))

    @tool
    async def get_business_summary():
        """Get an overview of business performance: total leads, hot/warm/cold counts, conversion rate. Use this instead of guessing numbers."""
        try:
            overview = await client.get_analytics_overview()
            return _ok(str(overview))
        except BackendError as e:
            return _err(str(e))

    @tool
    async def send_message_to_lead(lead_id: str, text: str):
        """Actually send a message to a lead, on whatever channel they were last messaged on. ONLY call this when the owner has explicitly confirmed they want it sent (e.g. "send it", "yes go ahead"). If they only asked you to draft something, reply with the draft as your own chat message instead and wait for confirmation — do not call this tool speculatively."""
        try:
            lead = await client.get_lead(lead_id)
            convo = await client.get_conversation(lead_id)
            messages = convo if isinstance(convo, list) else convo.get("data", [])
            channel = messages[-1].get("channel", "WHATSAPP") if messages else "WHATSAPP"
            await client.send_message(lead_id, channel, text)
            return _ok(f"message sent to {(lead.get('contact') or {}).get('name', 'lead')}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def create_task_for_lead(lead_id: str, title: str, priority: str = "medium"):
        """Create a follow-up task for the team on a specific lead."""
        try:
            await client.create_task(lead_id, title, priority)
            return _ok(f"task created: {title}")
        except BackendError as e:
            return _err(str(e))

    return [list_leads, get_lead_detail, get_business_summary, send_message_to_lead, create_task_for_lead]
