from dataclasses import dataclass
from langchain_core.tools import tool
from app.backend_client import BackendClient, BackendError


@dataclass
class ToolContext:
    client: BackendClient
    lead_id: str
    tenant_id: str


def _ok(msg: str) -> str:
    return f"ok: {msg}"


def _err(msg: str) -> str:
    return f"error: {msg}"


def build_tools(ctx: ToolContext) -> list:
    @tool
    async def send_message(text: str, template_id: str | None = None):
        """Send a message to the lead. Use to reply conversationally or follow up."""
        try:
            await ctx.client.send_message(ctx.lead_id, "WHATSAPP", text, template_id)
            return _ok("message sent")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def extract_fields(fields: list[dict]):
        """Save facts the lead revealed. fields: [{"key":"email","value":"a@b.com"}, ...]"""
        try:
            field_map = {f["key"]: f["value"] for f in fields}
            await ctx.client.update_custom_fields(ctx.lead_id, field_map)
            return _ok(f"stored {len(fields)} field(s)")
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
            from datetime import datetime, timezone, timedelta
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
        book_appointment,
        push_to_crm,
        record_conversion,
        mark_lost,
        escalate_to_human,
    ]
