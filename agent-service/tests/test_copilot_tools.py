import pytest
import httpx
import respx
from app.backend_client import BackendClient
from app.copilot_tools import build_copilot_tools
from app.config import Settings


@pytest.fixture
def client():
    s = Settings(backend_api_url="http://test:3001", agent_service_jwt="test-jwt", anthropic_api_key="test-key")
    return BackendClient(s)


@pytest.mark.asyncio
async def test_list_leads_all(client):
    tools = build_copilot_tools(client)
    list_leads = next(t for t in tools if t.name == "list_leads")
    with respx.mock:
        respx.get("http://test:3001/leads").mock(
            return_value=httpx.Response(200, json={"data": [
                {"id": "lead-1", "status": "NEW", "segment": "HOT", "score": 80, "contact": {"name": "Jane"}},
            ]})
        )
        result = await list_leads.ainvoke({"filter": "all"})
    assert result.startswith("ok:")
    assert "Jane" in result


@pytest.mark.asyncio
async def test_list_leads_hot_passes_segment_filter(client):
    tools = build_copilot_tools(client)
    list_leads = next(t for t in tools if t.name == "list_leads")
    with respx.mock:
        route = respx.get("http://test:3001/leads").mock(
            return_value=httpx.Response(200, json={"data": []})
        )
        result = await list_leads.ainvoke({"filter": "hot"})
    assert route.calls.last.request.url.params["segment"] == "HOT"
    assert result == "ok: no matching leads found"


@pytest.mark.asyncio
async def test_list_leads_unassigned_filters_client_side(client):
    tools = build_copilot_tools(client)
    list_leads = next(t for t in tools if t.name == "list_leads")
    with respx.mock:
        respx.get("http://test:3001/leads").mock(
            return_value=httpx.Response(200, json={"data": [
                {"id": "lead-1", "status": "NEW", "segment": "HOT", "score": 80, "contact": {"name": "Jane"}, "assignedAgentId": "agent-1"},
                {"id": "lead-2", "status": "NEW", "segment": "WARM", "score": 40, "contact": {"name": "Sam"}, "assignedAgentId": None},
            ]})
        )
        result = await list_leads.ainvoke({"filter": "unassigned"})
    assert "Sam" in result
    assert "Jane" not in result


@pytest.mark.asyncio
async def test_get_lead_detail(client):
    tools = build_copilot_tools(client)
    detail = next(t for t in tools if t.name == "get_lead_detail")
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"id": "lead-1", "status": "ENGAGED", "segment": "WARM", "score": 50, "contact": {"name": "Jane", "phone": "+1"}})
        )
        respx.get("http://test:3001/leads/lead-1/conversations").mock(
            return_value=httpx.Response(200, json=[{"direction": "INBOUND", "text": "Hi"}])
        )
        result = await detail.ainvoke({"lead_id": "lead-1"})
    assert result.startswith("ok:")
    assert "Jane" in result
    assert "Hi" in result


@pytest.mark.asyncio
async def test_send_message_to_lead_uses_last_channel(client):
    tools = build_copilot_tools(client)
    send = next(t for t in tools if t.name == "send_message_to_lead")
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"id": "lead-1", "contact": {"name": "Jane"}})
        )
        respx.get("http://test:3001/leads/lead-1/conversations").mock(
            return_value=httpx.Response(200, json=[{"direction": "OUTBOUND", "text": "prev", "channel": "TELEGRAM"}])
        )
        route = respx.post("http://test:3001/conversations/messages").mock(
            return_value=httpx.Response(201, json={"id": "msg-1"})
        )
        result = await send.ainvoke({"lead_id": "lead-1", "text": "Following up!"})
    assert result.startswith("ok:")
    import json
    body = json.loads(route.calls.last.request.content)
    assert body["channel"] == "TELEGRAM"


@pytest.mark.asyncio
async def test_create_task_for_lead(client):
    tools = build_copilot_tools(client)
    create_task = next(t for t in tools if t.name == "create_task_for_lead")
    with respx.mock:
        respx.post("http://test:3001/tasks").mock(
            return_value=httpx.Response(201, json={"id": "task-1"})
        )
        result = await create_task.ainvoke({"lead_id": "lead-1", "title": "Call back", "priority": "high"})
    assert result.startswith("ok:")


@pytest.mark.asyncio
async def test_get_business_summary(client):
    tools = build_copilot_tools(client)
    summary = next(t for t in tools if t.name == "get_business_summary")
    with respx.mock:
        respx.get("http://test:3001/analytics/overview").mock(
            return_value=httpx.Response(200, json={"total": 100, "hot": 10, "conversionRate": "5.0"})
        )
        result = await summary.ainvoke({})
    assert result.startswith("ok:")
    assert "100" in result
