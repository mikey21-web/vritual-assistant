from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from langchain_core.tools import tool
from app.backend_client import BackendClient, BackendError

import structlog

logger = structlog.get_logger()


@dataclass
class ToolContext:
    client: BackendClient
    lead_id: str
    tenant_id: str
    channel: str = "WHATSAPP"
    # Set by graph._load_context once the lead's contact is resolved — tool
    # closures below read it live, so it's available by the time any tool runs
    # even though it's unknown when ToolContext is first constructed.
    contact_id: str | None = None


def _ok(msg: str) -> str:
    return f"ok: {msg}"


def _err(msg: str) -> str:
    return f"error: {msg}"


def build_tools(ctx: ToolContext) -> list:
    @tool
    async def send_message(text: str, template_id: str | None = None):
        """Send a message to the lead. Use to reply conversationally or follow up."""
        try:
            await ctx.client.send_message(ctx.lead_id, ctx.channel, text, template_id)
            return _ok("message sent")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def extract_fields(fields: list[dict]):
        """Save facts the lead revealed. fields: [{"key":"email","value":"a@b.com"}, ...]"""
        try:
            if not isinstance(fields, list):
                return _err("fields must be a list")
            field_map = {}
            for f in fields:
                if not isinstance(f, dict):
                    continue
                k = str(f.get("key", "")).strip()
                v = str(f.get("value", ""))
                if not k or len(k) > 100:
                    continue
                if len(v) > 5000:
                    v = v[:5000]
                field_map[k] = v
            if not field_map:
                return _err("no valid fields to store")
            await ctx.client.update_custom_fields(ctx.lead_id, field_map)
            if ctx.contact_id:
                try:
                    await ctx.client.update_contact_memory(
                        ctx.contact_id,
                        facts=[{"key": k, "value": v} for k, v in field_map.items()],
                    )
                except Exception as e:
                    # Durable cross-channel memory is best-effort — never let it
                    # fail the primary lead-metadata write above.
                    logger.warning("memory_write_failed", error=str(e))
            return _ok(f"stored {len(field_map)} field(s)")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def update_score():
        """Re-score the lead based on scoring rules in the backend."""
        try:
            result = await ctx.client.update_score(ctx.lead_id)
            return _ok(f"score={result.get('score', '?')}, segment={result.get('segment', '?')}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def update_status(status: str):
        """Move the lead to a new pipeline stage (NEW, QUALIFIED, LOST, etc.)"""
        try:
            await ctx.client.update_status(ctx.lead_id, status)
            return _ok(f"status \u2192 {status}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def set_segment(segment: str):
        """Tag the lead as HOT, WARM, COLD, or UNQUALIFIED."""
        try:
            await ctx.client.set_segment(ctx.lead_id, segment)
            return _ok(f"segment \u2192 {segment}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def assign_agent(reason: str):
        """Route this lead to a human sales agent. Use when the lead asks for a human or needs specialist help."""
        try:
            await ctx.client.assign_agent(ctx.lead_id)
            await ctx.client.create_task(ctx.lead_id, f"Escalation: {reason}", "high")
            return _ok(f"assigned \u2014 {reason}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def create_task(title: str, due_in_hours: int | None = None):
        """Create a follow-up task for this lead."""
        try:
            due_at = None
            if due_in_hours:
                due_at = (datetime.now(timezone.utc) + timedelta(hours=due_in_hours)).isoformat()
            await ctx.client.create_task(ctx.lead_id, title, "medium", due_at)
            return _ok(f"task created: {title}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def book_appointment(booking_type: str):
        """Book an appointment / consultation for the lead."""
        try:
            await ctx.client.book_appointment(ctx.lead_id, booking_type)
            return _ok(f"appointment requested: {booking_type}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def remember_note(note: str):
        """Save a free-form note about this contact for future conversations on ANY channel — a stated preference, something they mentioned in passing, context that would make a returning conversation feel remembered. Use this for things that don't fit as a structured key/value fact (that's extract_fields' job)."""
        try:
            if not ctx.contact_id:
                return _err("no contact on file yet")
            if not note or not note.strip():
                return _err("empty note")
            await ctx.client.update_contact_memory(ctx.contact_id, note=note.strip())
            return _ok("noted for future conversations")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def search_knowledge_base(query: str):
        """Search the FAQ knowledge base before answering a question you're not certain about, or before escalating to a human because the lead asked something. Returns matching Q&A pairs — use them to compose your own reply via send_message, don't just paste the answer verbatim if it needs adapting to the conversation."""
        try:
            results = await ctx.client.search_knowledge_base(query)
            if not results:
                return _err("no matching FAQ entries found")
            formatted = "\n".join(f"- Q: {r.get('question', '')}\n  A: {r.get('answer', '')}" for r in results[:3])
            return _ok(f"found {len(results)} match(es):\n{formatted}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def check_availability():
        """Check upcoming open appointment slots. Call this before book_appointment or reschedule_appointment when the lead hasn't already named a specific time, or when you need real slots to offer."""
        try:
            result = await ctx.client.get_booking_availability(ctx.lead_id)
            if result.get("error"):
                return _err(result["error"])
            if result.get("slots"):
                return _ok(f"available slots: {', '.join(result['slots'])}")
            if result.get("note"):
                return _ok(result["note"])
            return _err("no availability information returned")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def reschedule_appointment(new_time: str, reason: str):
        """Move the lead's existing appointment to a new time. new_time must be an ISO 8601 datetime, e.g. 2026-07-15T14:00:00Z — convert whatever the lead said (like "Thursday at 3pm") into that format using today's date for context. Fails if there's no existing appointment to move."""
        try:
            result = await ctx.client.reschedule_booking(ctx.lead_id, new_time, reason)
            return _ok(f"rescheduled to {result.get('scheduledAt', new_time)}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def cancel_appointment(reason: str):
        """Cancel the lead's existing appointment. Fails if there's no existing appointment to cancel."""
        try:
            await ctx.client.cancel_booking(ctx.lead_id, reason)
            return _ok(f"appointment cancelled — {reason}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def push_to_crm():
        """Push this qualified lead to the CRM."""
        try:
            await ctx.client.push_to_crm(ctx.lead_id)
            return _ok("pushed to CRM")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def record_conversion(destination: str):
        """Record a conversion (use: QUOTE_REQUEST, PURCHASE_ONLINE, BOOKING_MADE). Call ONLY ONE per run."""
        try:
            await ctx.client.record_conversion(ctx.lead_id, destination)
            return _ok(f"conversion recorded: {destination}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def mark_lost(reason: str):
        """Mark the lead as LOST and terminate the conversation. Provide a reason."""
        try:
            if not reason or reason.strip() == "":
                reason = "unspecified"
            await ctx.client.update_status(ctx.lead_id, "LOST")
            await ctx.client.set_segment(ctx.lead_id, "UNQUALIFIED")
            return _ok(f"marked lost \u2014 {reason}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def escalate_to_human(reason: str):
        """Escalate to a human agent. Call this then STOP — do not call send_message after this."""
        try:
            await ctx.client.assign_agent(ctx.lead_id)
            await ctx.client.create_task(ctx.lead_id, f"Escalation: {reason}", "high")
            return _ok(f"escalated \u2014 {reason}")
        except BackendError as e:
            return _err(str(e))

    return [
        send_message,
        extract_fields,
        update_score,
        update_status,
        set_segment,
        assign_agent,
        create_task,
        remember_note,
        search_knowledge_base,
        check_availability,
        book_appointment,
        reschedule_appointment,
        cancel_appointment,
        push_to_crm,
        record_conversion,
        mark_lost,
        escalate_to_human,
    ]
