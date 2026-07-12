import pytest
import httpx
import respx
from app.backend_client import BackendClient
from app.tools import build_tools, ToolContext
from app.config import Settings


@pytest.fixture
def tool_ctx():
    s = Settings(
        backend_api_url="http://test:3001",
        agent_service_jwt="test-jwt",
        anthropic_api_key="test-key",
    )
    client = BackendClient(s)
    return ToolContext(client=client, lead_id="lead-1", tenant_id="tenant-1")


@pytest.mark.asyncio
async def test_send_message_ok(tool_ctx):
    tools = build_tools(tool_ctx)
    send_msg = next(t for t in tools if t.name == "send_message")
    with respx.mock:
        respx.post("http://test:3001/conversations/messages").mock(
            return_value=httpx.Response(201, json={"id": "msg-1"})
        )
        result = await send_msg.ainvoke({"text": "Hello"})
    assert result == "ok: message sent"


@pytest.mark.asyncio
async def test_tool_returns_error_on_failure(tool_ctx):
    tools = build_tools(tool_ctx)
    send_msg = next(t for t in tools if t.name == "send_message")
    with respx.mock:
        respx.post("http://test:3001/conversations/messages").mock(
            return_value=httpx.Response(500, json={"message": "down"})
        )
        result = await send_msg.ainvoke({"text": "Hello"})
    assert result.startswith("error:")


@pytest.mark.asyncio
async def test_extract_fields(tool_ctx):
    tools = build_tools(tool_ctx)
    ef = next(t for t in tools if t.name == "extract_fields")
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"id": "lead-1", "metadata": {}})
        )
        respx.patch("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"ok": True})
        )
        result = await ef.ainvoke({"fields": [{"key": "email", "value": "a@b.com"}]})
    assert result.startswith("ok:")


@pytest.mark.asyncio
async def test_mark_lost(tool_ctx):
    tools = build_tools(tool_ctx)
    ml = next(t for t in tools if t.name == "mark_lost")
    with respx.mock:
        respx.patch("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"status": "LOST"})
        )
        result = await ml.ainvoke({"reason": "not interested"})
    assert "LOST" in result or "ok:" in result


@pytest.mark.asyncio
async def test_book_appointment(tool_ctx):
    tools = build_tools(tool_ctx)
    ba = next(t for t in tools if t.name == "book_appointment")
    with respx.mock:
        respx.post("http://test:3001/leads/lead-1/bookings").mock(
            return_value=httpx.Response(201, json={"id": "bk-1", "status": "SCHEDULED"})
        )
        result = await ba.ainvoke({"booking_type": "Consultation"})
    assert "appointment" in result or "ok:" in result


@pytest.mark.asyncio
async def test_search_knowledge_base_found(tool_ctx):
    tools = build_tools(tool_ctx)
    skb = next(t for t in tools if t.name == "search_knowledge_base")
    with respx.mock:
        respx.get("http://test:3001/knowledge-base/search").mock(
            return_value=httpx.Response(200, json=[{"question": "What are your hours?", "answer": "9-6 Mon-Fri"}])
        )
        result = await skb.ainvoke({"query": "hours"})
    assert result.startswith("ok:")
    assert "hours" in result.lower()


@pytest.mark.asyncio
async def test_search_knowledge_base_no_match(tool_ctx):
    tools = build_tools(tool_ctx)
    skb = next(t for t in tools if t.name == "search_knowledge_base")
    with respx.mock:
        respx.get("http://test:3001/knowledge-base/search").mock(
            return_value=httpx.Response(200, json=[])
        )
        result = await skb.ainvoke({"query": "something obscure"})
    assert result.startswith("error:")


@pytest.mark.asyncio
async def test_check_availability_slots(tool_ctx):
    tools = build_tools(tool_ctx)
    ca = next(t for t in tools if t.name == "check_availability")
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1/bookings/availability").mock(
            return_value=httpx.Response(200, json={"slots": ["2026-07-15T14:00:00Z"]})
        )
        result = await ca.ainvoke({})
    assert result.startswith("ok:")
    assert "2026-07-15T14:00:00Z" in result


@pytest.mark.asyncio
async def test_reschedule_appointment(tool_ctx):
    tools = build_tools(tool_ctx)
    ra = next(t for t in tools if t.name == "reschedule_appointment")
    with respx.mock:
        respx.post("http://test:3001/leads/lead-1/bookings/reschedule").mock(
            return_value=httpx.Response(200, json={"id": "bk-2", "scheduledAt": "2026-07-15T14:00:00Z"})
        )
        result = await ra.ainvoke({"new_time": "2026-07-15T14:00:00Z", "reason": "lead asked to move"})
    assert result.startswith("ok:")


@pytest.mark.asyncio
async def test_cancel_appointment(tool_ctx):
    tools = build_tools(tool_ctx)
    cxl = next(t for t in tools if t.name == "cancel_appointment")
    with respx.mock:
        respx.post("http://test:3001/leads/lead-1/bookings/cancel").mock(
            return_value=httpx.Response(200, json={"id": "bk-1", "status": "CANCELLED"})
        )
        result = await cxl.ainvoke({"reason": "no longer interested"})
    assert result.startswith("ok:")


@pytest.mark.asyncio
async def test_cancel_appointment_error(tool_ctx):
    tools = build_tools(tool_ctx)
    cxl = next(t for t in tools if t.name == "cancel_appointment")
    with respx.mock:
        respx.post("http://test:3001/leads/lead-1/bookings/cancel").mock(
            return_value=httpx.Response(400, json={"message": "No active booking to cancel for this lead"})
        )
        result = await cxl.ainvoke({"reason": "no longer interested"})
    assert result.startswith("error:")
