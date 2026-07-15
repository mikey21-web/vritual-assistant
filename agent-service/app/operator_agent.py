from __future__ import annotations

from langchain_core.tools import tool
from app.backend_client import BackendClient


def build_operator_tools(client: BackendClient, tenant_id: str) -> list:
    @tool
    async def search_leads(status: str | None = None, segment: str | None = None,
                           search: str | None = None, limit: int = 20):
        """Search leads by status, segment, or text search."""
        params = {}
        if status: params["status"] = status
        if segment: params["segment"] = segment
        if search: params["search"] = search
        if limit: params["limit"] = limit
        try:
            result = await client._get("/leads?" + "&".join(f"{k}={v}" for k, v in params.items()))
            return f"Found {len(result if isinstance(result, list) else result.get('data', []))} leads"
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

    return [
        search_leads, search_contacts, get_lead_detail, update_lead_status,
        create_task, create_ticket, update_ticket, send_message, draft_message,
        list_tickets, list_campaigns, create_campaign, create_custom_field,
        get_analytics_overview, run_report, initiate_call, send_email,
        bulk_send_message, analyze_lead_source, search_knowledge,
        navigate_ui, explain_flow, define_outcome, run_autonomous_action,
    ]
