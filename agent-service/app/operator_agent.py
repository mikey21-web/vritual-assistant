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
    async def send_message(lead_id: str, text: str, channel: str = "WHATSAPP"):
        """Send a message to a lead (high impact — requires confirmation)."""
        try:
            result = await client.send_message(lead_id, channel, text)
            return f"Message sent to {lead_id}"
        except Exception as e:
            return f"error: {e}"

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

    return [
        search_leads, get_lead_detail, update_lead_status,
        create_task, create_ticket, send_message, draft_message,
        list_tickets, list_campaigns, get_analytics_overview,
        run_report, initiate_call, send_email, bulk_send_message,
        analyze_lead_source, search_knowledge,
    ]
