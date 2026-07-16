from __future__ import annotations

from langchain_core.tools import tool
from app.backend_client import BackendClient


def build_operator_tools(client: BackendClient, tenant_id: str) -> list:
    @tool
    async def search_leads(status: str | None = None, segment: str | None = None,
                           search: str | None = None, assigned_agent_id: str | None = None, limit: int = 20):
        """Search leads by status (e.g. NEW, QUALIFIED), segment (HOT, WARM, COLD), assigned agent id, or text search. Returns each lead's id, name, status, segment, and score so you can act on a specific one afterward (e.g. get_lead_detail, update_lead_status, assign_lead_to_agent, book_site_visit)."""
        params = {}
        if status: params["status"] = status
        if segment: params["segment"] = segment
        if search: params["search"] = search
        if assigned_agent_id: params["assignedAgentId"] = assigned_agent_id
        if limit: params["limit"] = limit
        try:
            result = await client._get("/leads?" + "&".join(f"{k}={v}" for k, v in params.items()))
            leads = result if isinstance(result, list) else result.get("data", [])
            if not leads:
                return "Found 0 leads"
            summary = "; ".join(
                f"{l['id']}: {l.get('contact', {}).get('name', 'Unknown')} ({l.get('status', '?')}/{l.get('segment', '?')}, score {l.get('score', '?')})"
                for l in leads[:20]
            )
            return f"Found {len(leads)} lead(s): {summary}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def search_contacts(search: str):
        """Search contacts by name, email, or phone."""
        try:
            result = await client._get(f"/contacts?search={search}")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def get_lead_detail(lead_id: str):
        """Get detailed info on a lead by ID."""
        try:
            result = await client._get(f"/leads/{lead_id}")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def update_lead_status(lead_id: str, status: str):
        """Change a lead's status. Internal-only, execute immediately."""
        try:
            result = await client._patch(f"/leads/{lead_id}", {"status": status})
            return f"Status updated to {status}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def create_task(lead_id: str, title: str, description: str | None = None,
                          priority: int = 3, due_at: str | None = None):
        """Create a task for a lead."""
        try:
            body = {"leadId": lead_id, "title": title, "priority": priority}
            if description: body["description"] = description
            if due_at: body["dueAt"] = due_at
            result = await client._post("/tasks", body)
            return f"Task created: {result.get('id', '')}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def create_ticket(subject: str, description: str, lead_id: str | None = None,
                            priority: str = "MEDIUM"):
        """Create a support ticket."""
        try:
            body = {"subject": subject, "description": description, "priority": priority}
            if lead_id: body["leadId"] = lead_id
            result = await client._post("/tickets", body)
            return f"Ticket created: {result.get('id', '')}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def update_ticket(ticket_id: str, status: str | None = None, priority: str | None = None, assigned_to_id: str | None = None):
        """Update a support ticket's status, priority, or assignee."""
        try:
            body = {}
            if status: body["status"] = status
            if priority: body["priority"] = priority
            if assigned_to_id: body["assignedToId"] = assigned_to_id
            result = await client._patch(f"/tickets/{ticket_id}", body)
            return f"Ticket {ticket_id} updated"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def send_message(lead_id: str, text: str, channel: str = "WHATSAPP"):
        """Send a message to a lead (high impact — requires confirmation)."""
        return f"pending confirmation: message to {lead_id} via {channel}"

    @tool
    async def draft_message(lead_id: str, instructions: str):
        """Draft a message for a lead (does NOT send)."""
        try:
            lead = await client._get(f"/leads/{lead_id}")
            name = lead.get("contact", {}).get("name", "lead")
            return f"[Draft for {name}]: {instructions}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def list_tickets(status: str | None = None, priority: str | None = None):
        """List support tickets with optional filters."""
        try:
            params = {}
            if status: params["status"] = status
            if priority: params["priority"] = priority
            result = await client._get("/tickets?" + "&".join(f"{k}={v}" for k, v in params.items()))
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def list_campaigns(status: str | None = None):
        """List campaigns."""
        try:
            params = {}
            if status: params["status"] = status
            result = await client._get("/campaigns?" + "&".join(f"{k}={v}" for k, v in params.items()))
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def create_campaign(name: str, type: str = "", description: str = ""):
        """Create a marketing campaign (high impact — requires confirmation)."""
        return f"pending confirmation: campaign '{name}' will be created"

    @tool
    async def create_custom_field(name: str, field_type: str, target: str, options: list[str] | None = None):
        """Create a custom field for leads, contacts, or deals."""
        try:
            body = {"name": name, "fieldType": field_type, "target": target}
            if options: body["options"] = options
            result = await client._post("/custom-fields", body)
            return f"Custom field created: {result.get('id', '')}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def get_analytics_overview():
        """Get CRM analytics summary."""
        try:
            result = await client._get("/analytics/overview")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def run_report(entity: str, metric: str, group_by: str | None = None):
        """Run a report with entity, metric, optional groupBy."""
        try:
            result = await client._post("/reports/run", {
                "entity": entity, "metric": metric, "groupBy": group_by,
            })
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def initiate_call(lead_id: str):
        """Initiate an outbound call to a lead (high impact)."""
        return f"pending confirmation: call to {lead_id}"

    @tool
    async def send_email(lead_id: str, to: str, subject: str, body: str):
        """Send an email to a lead (high impact)."""
        return f"pending confirmation: email to {to} subject: {subject}"

    @tool
    async def bulk_send_message(messages: list[dict]):
        """Send messages to multiple leads at once (high impact, max 20)."""
        return f"pending confirmation: batch of {len(messages)} messages"

    @tool
    async def analyze_lead_source(source: str):
        """Get conversion rate and status breakdown for a lead source."""
        try:
            result = await client._get(f"/analytics/lead-source?source={source}")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def search_knowledge(search: str):
        """Search the Knowledge Base for company info."""
        try:
            result = await client._get(f"/knowledge?search={search}")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def navigate_ui(page: str, filters: dict | None = None, highlight_id: str | None = None, zoom: str | None = None, summary: str | None = None):
        """Navigate the CRM UI to a specific page with optional filters, highlights, and zoom."""
        parts = [f"navigated to {page}"]
        if summary:
            parts.append(summary)
        return ": ".join(parts)

    @tool
    async def explain_flow(steps: list[dict]):
        """Explain a sequence of steps the user should follow in the CRM UI."""
        return "explanation prepared"

    @tool
    async def define_outcome(goal: str, metric: str, target: float, current: float):
        """Define a measurable outcome to track (high impact — requires confirmation)."""
        return f"pending confirmation: outcome '{goal}' with metric {metric}"

    @tool
    async def create_payment_schedule(lead_id: str, label: str, amount: float, due_date: str | None = None, booking_id: str | None = None):
        """Create a payment milestone for a lead (e.g. Booking Amount, Registration, Possession). due_date should be an ISO date (YYYY-MM-DD). Automated reminders are scheduled 3 days before and on the due date. Internal-only, executes immediately."""
        try:
            body = {"leadId": lead_id, "label": label, "amount": amount}
            if due_date: body["dueDate"] = due_date
            if booking_id: body["bookingId"] = booking_id
            result = await client._post("/payment-schedules", body)
            return f"Payment milestone created: {result.get('id', '')} — {label} ({amount})"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def list_payment_schedules(lead_id: str | None = None, status: str | None = None):
        """List payment milestones, optionally filtered by lead or status (PENDING, PAID, OVERDUE, WAIVED)."""
        try:
            params = {}
            if lead_id: params["leadId"] = lead_id
            if status: params["status"] = status
            result = await client._get("/payment-schedules?" + "&".join(f"{k}={v}" for k, v in params.items()))
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def allocate_lead_to_partner(lead_id: str, partner_id: str | None = None):
        """Allocate (or unallocate, if partner_id is omitted) a lead to a channel partner / broker. Internal-only, executes immediately."""
        try:
            body = {"leadId": lead_id, "partnerId": partner_id}
            result = await client._post("/channel-partners/allocate", body)
            return f"Lead {lead_id} allocated to partner {partner_id or '(none)'}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def search_channel_partners(search: str | None = None, status: str | None = None):
        """Search channel partners / brokers by name, company, or phone."""
        try:
            params = {}
            if search: params["search"] = search
            if status: params["status"] = status
            result = await client._get("/channel-partners?" + "&".join(f"{k}={v}" for k, v in params.items()))
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def get_partner_performance(partner_id: str):
        """Get a channel partner's performance: leads sourced, converted, conversion rate, and commission owed."""
        try:
            result = await client._get(f"/channel-partners/{partner_id}/performance")
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def run_autonomous_action(action: str, lead_id: str | None = None, args: dict | None = None):
        """Run an autonomous action on a lead (e.g. enrichment, scoring)."""
        try:
            body = {"action": action}
            if lead_id: body["leadId"] = lead_id
            if args: body["args"] = args
            result = await client._post("/mikey/autonomous-action", body)
            return str(result)[:1000]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def assign_lead_to_agent(lead_id: str, agent_id: str | None = None):
        """Assign a lead to a sales agent (by user id), or unassign if agent_id is omitted. Internal-only, executes immediately."""
        try:
            body = {"agentId": agent_id} if agent_id else {}
            result = await client._post(f"/leads/{lead_id}/assign", body)
            return f"Lead {lead_id} assigned to {agent_id or '(unassigned)'}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def book_site_visit(lead_id: str, title: str, start_time: str, end_time: str | None = None,
                              property_id: str | None = None, description: str | None = None):
        """Book a site visit / appointment for a lead. start_time and end_time are ISO datetimes. Use search_properties first to get a property_id if the visit is for a specific listing. Internal-only, executes immediately."""
        try:
            body: dict = {"leadId": lead_id, "title": title, "startTime": start_time}
            if end_time: body["endTime"] = end_time
            if property_id: body["propertyId"] = property_id
            if description: body["description"] = description
            result = await client._post(f"/leads/{lead_id}/bookings", body)
            return f"Visit booked: {result.get('id', '')} — {title} at {start_time}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def update_booking(booking_id: str, start_time: str | None = None, status: str | None = None, notes: str | None = None):
        """Reschedule (new start_time), cancel/confirm/complete (status: PENDING, CONFIRMED, CANCELLED, COMPLETED), or add notes to an existing booking/site visit. Internal-only, executes immediately."""
        try:
            body: dict = {}
            if start_time: body["startTime"] = start_time
            if status: body["status"] = status
            if notes: body["notes"] = notes
            result = await client._patch(f"/bookings/{booking_id}", body)
            return f"Booking {booking_id} updated"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def search_properties(location: str | None = None, budget_max: float = 0, bedrooms: int = 0, property_type: str | None = None):
        """Search available broker/resale property listings by location, max budget, bedrooms, or type. Returns id, title, price, location so you can reference a property_id in book_site_visit."""
        try:
            query: dict = {}
            if location: query["location"] = location
            if budget_max > 0: query["maxPrice"] = budget_max
            if bedrooms > 0: query["bedrooms"] = bedrooms
            if property_type: query["propertyType"] = property_type.upper()
            results = await client.search_properties(tenant_id, query)
            if not results:
                return "No properties found matching those criteria"
            summary = "; ".join(f"{p['id']}: {p.get('title', '')} (₹{p.get('price', '?')}, {p.get('location', '')})" for p in results[:10])
            return f"Found {len(results)} propert(y/ies): {summary}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def search_units(project_id: str | None = None, unit_type: str | None = None, budget_max: float = 0, min_area: float = 0):
        """Search available builder-project units (Project -> Tower -> Unit inventory) by project, unit type (e.g. 2BHK), max budget, or min area. Returns id, unit number, project/tower, price."""
        try:
            query: dict = {"status": "AVAILABLE"}
            if project_id: query["projectId"] = project_id
            if unit_type: query["unitType"] = unit_type
            if budget_max > 0: query["maxPrice"] = budget_max
            if min_area > 0: query["minArea"] = min_area
            results = await client.search_units(query)
            if not results:
                return "No available units found matching those criteria"
            summary = "; ".join(
                f"{u['id']}: Unit {u.get('unitNumber', '?')} ({u.get('project', {}).get('name', '')}) — ₹{u.get('price', '?')}"
                for u in results[:10]
            )
            return f"Found {len(results)} unit(s): {summary}"
        except Exception as e:
            return f"error: {e}"

    @tool
    async def get_lead_brief(lead_id: str):
        """Get the pre-visit brief for a lead: buyer profile, preferences, upcoming booking, matching properties/units, objections raised, and internal notes. Use before a site visit or when asked to prep on a specific lead."""
        try:
            result = await client._get(f"/leads/{lead_id}/brief")
            return str(result)[:1500]
        except Exception as e:
            return f"error: {e}"

    @tool
    async def get_team_command():
        """Get the owner's team command view: agent performance, stale/unassigned hot leads, overdue tasks, today's visits, overall conversion rate. Use for 'how's the team doing' or 'what needs my attention' type questions."""
        try:
            result = await client._get("/analytics/team-command")
            return str(result)[:1500]
        except Exception as e:
            return f"error: {e}"

    return [
        search_leads, search_contacts, get_lead_detail, update_lead_status,
        create_task, create_ticket, update_ticket, send_message, draft_message,
        list_tickets, list_campaigns, create_campaign, create_custom_field,
        get_analytics_overview, run_report, initiate_call, send_email,
        bulk_send_message, analyze_lead_source, search_knowledge,
        navigate_ui, explain_flow, define_outcome, run_autonomous_action,
        create_payment_schedule, list_payment_schedules,
        allocate_lead_to_partner, search_channel_partners, get_partner_performance,
        assign_lead_to_agent, book_site_visit, update_booking,
        search_properties, search_units, get_lead_brief, get_team_command,
    ]
