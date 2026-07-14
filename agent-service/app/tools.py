from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from langchain_core.tools import tool
from app.backend_client import BackendClient, BackendError


@dataclass
class ToolContext:
    client: BackendClient
    lead_id: str
    tenant_id: str
    channel: str = "WHATSAPP"
    features: dict = None


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
    async def book_appointment(booking_type: str, start_time: str | None = None, description: str | None = None):
        """Book an appointment / consultation for the lead. If start_time is provided, creates a real booking. Otherwise records a conversion request."""
        try:
            has_booking = ctx.features and ctx.features.get("booking")
            if start_time and has_booking:
                result = await ctx.client.create_booking(ctx.lead_id, f"{booking_type} - {ctx.lead_id}", start_time, description=description)
                return _ok(f"booking created: {result.get('id', '')} at {start_time}")
            await ctx.client.book_appointment(ctx.lead_id, booking_type)
            return _ok(f"appointment requested: {booking_type}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def check_availability(start_time: str, duration_minutes: int = 60):
        """Check if a time slot is available for booking. Returns available slots and conflicts."""
        if not (ctx.features and ctx.features.get("booking")):
            return _err("booking feature is not enabled for this niche")
        try:
            result = await ctx.client.check_availability(start_time, duration_minutes)
            if result.get("available"):
                return _ok(f"slot available at {start_time}")
            conflicts = result.get("conflicts", [])
            return _err(f"slot not available: {len(conflicts)} conflict(s)")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def create_payment_link(booking_id: str):
        """Generate a payment link for an existing booking. Call after the booking is created and confirmed."""
        if not (ctx.features and ctx.features.get("booking")):
            return _err("booking feature is not enabled for this niche")
        try:
            result = await ctx.client.create_booking_payment_link(booking_id)
            url = result.get("url", "")
            return _ok(f"payment link: {url}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def schedule_follow_up(days_from_now: int = 7, message: str = ""):
        """Schedule a follow-up message to be sent later. Use when the lead needs time to decide."""
        try:
            due = (datetime.now(timezone.utc) + timedelta(days=days_from_now)).isoformat()
            title = f"Follow up: {message[:100]}" if message else "Follow up with lead"
            await ctx.client.create_task(ctx.lead_id, title, "medium", due)
            return _ok(f"follow-up scheduled in {days_from_now} day(s)")
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
            return _ok(f"escaped \u2014 {reason}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def get_quote(origin: str, destination: str, weight: float, shipment_type: str = "FTL", cargo_type: str = "GENERAL"):
        """Generate a shipment quote based on origin, destination, weight, shipment type, and cargo type. Returns price and transit time."""
        if not (ctx.features and ctx.features.get("shipments")):
            return _err("shipments feature is not enabled for this niche")
        try:
            result = await ctx.client.get_quote(origin, destination, weight, shipment_type, cargo_type)
            total = result.get("total", 0)
            transit = result.get("estimatedTransitTime", "N/A")
            return _ok(f"Quote: \u20B9{total:,.2f} | Transit: {transit} | Route: {origin} \u2192 {destination} | Weight: {weight}kg")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def create_shipment(origin: str, destination: str, weight: float, shipment_type: str = "FTL", cargo_type: str = "GENERAL", pickup_date: str = "", notes: str = ""):
        """Create a shipment record after the lead accepts the quote. Provide origin, destination, weight, shipment type, cargo type, and optionally pickup date."""
        if not (ctx.features and ctx.features.get("shipments")):
            return _err("shipments feature is not enabled for this niche")
        try:
            quote = await ctx.client.get_quote(origin, destination, weight, shipment_type, cargo_type)
            price = quote.get("total", 0)
            result = await ctx.client.create_shipment(ctx.lead_id, origin, destination, weight, shipment_type, cargo_type, price, pickup_date or None, notes or None)
            tracking = result.get("trackingNumber", "")
            return _ok(f"Shipment created! Tracking: {tracking} | Amount: \u20B9{price:,.2f} | Route: {origin} \u2192 {destination}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def update_shipment_status(shipment_id: str, status: str, notes: str = "", location: str = ""):
        """Update the status of a shipment by its ID. Use status values: PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION. The shipment_id is returned by create_shipment."""
        if not (ctx.features and ctx.features.get("shipments")):
            return _err("shipments feature is not enabled for this niche")
        try:
            result = await ctx.client.update_shipment_status(shipment_id, status, notes or None, location or None)
            return _ok(f"Status updated to {status}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def create_event_draft(event_type: str, title: str, event_date: str = "", venue: str = "", expected_guests: int = 0, budget: float = 0, description: str = ""):
        """Create a draft event record in the system. Use when the lead confirms they want to proceed with event planning. Provide event type, title for the event, and optionally date, venue, guest count, budget."""
        if not (ctx.features and ctx.features.get("booking")):
            return _err("booking feature is not enabled for this niche")
        try:
            result = await ctx.client.create_event(
                ctx.tenant_id, ctx.lead_id, title or f"{event_type} Event",
                event_type, event_date or None, venue or None,
                expected_guests or None, budget or None, description or None,
            )
            return _ok(f"Event draft created: {result.get('id', '')} — {title}")
        except BackendError as e:
            return _err(str(e))

    @tool
    async def search_properties(location: str = "", budget_max: float = 0, bedrooms: int = 0, property_type: str = ""):
        """Search available property listings. Search matching properties by location, max budget, bedrooms, or property type. Returns matching listings with title, price, location, bedrooms, and features."""
        if not (ctx.features and ctx.features.get("properties")):
            return _err("properties feature is not enabled for this niche")
        try:
            query = {}
            if location: query["location"] = location
            if budget_max > 0: query["maxPrice"] = budget_max
            if bedrooms > 0: query["bedrooms"] = bedrooms
            if property_type: query["propertyType"] = property_type.upper()
            results = await ctx.client.search_properties(ctx.tenant_id, query)
            if not results:
                return _ok("no properties found matching your criteria")
            summary = "\n".join(
                f"- {p['title']} | \u20B9{p.get('price', 'N/A')} | {p.get('location', '')} | {p.get('bedrooms', '?')}BHK"
                for p in results[:5]
            )
            return _ok(f"found {len(results)} properties:\n{summary}")
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
        check_availability,
        create_payment_link,
        schedule_follow_up,
        push_to_crm,
        record_conversion,
        mark_lost,
        escalate_to_human,
        search_properties,
        get_quote,
        create_shipment,
        update_shipment_status,
        create_event_draft,
    ]
