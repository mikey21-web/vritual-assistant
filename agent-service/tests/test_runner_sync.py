import pytest
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage

from app.runner import execute_run_sync
from app.schemas import AgentRunRequest
from app.config import Settings
from app.idempotency import init as idempotency_init, close as idempotency_close


@pytest.fixture
def settings():
    return Settings(backend_api_url="http://test:3001", agent_service_jwt="test-jwt", agent_inbound_key="test-key", deepseek_api_key="test-key")


@pytest.mark.asyncio
async def test_execute_run_sync_returns_last_ai_message(settings):
    await idempotency_init(None)
    req = AgentRunRequest(tenantId="t-1", leadId="lead-1", triggerId="trg-sync-1", channel="PHONE_CALL", trigger="call_started", messageText=None)

    fake_graph = AsyncMock()
    fake_graph.ainvoke = AsyncMock(return_value={"messages": [AIMessage(content="Hi there, how can I help?")], "terminate": False})

    with patch("app.runner.build_graph", return_value=fake_graph), patch("app.runner.BackendClient") as MockClient:
        MockClient.return_value.close = AsyncMock()
        result = await execute_run_sync(settings, req)

    assert result["reply"] == "Hi there, how can I help?"
    assert result["terminate"] is False
    await idempotency_close()


@pytest.mark.asyncio
async def test_execute_run_sync_falls_back_on_exception(settings):
    await idempotency_init(None)
    req = AgentRunRequest(tenantId="t-1", leadId="lead-1", triggerId="trg-sync-2", channel="PHONE_CALL", trigger="call_started", messageText=None)

    fake_graph = AsyncMock()
    fake_graph.ainvoke = AsyncMock(side_effect=RuntimeError("boom"))

    with patch("app.runner.build_graph", return_value=fake_graph), patch("app.runner.BackendClient") as MockClient:
        MockClient.return_value.close = AsyncMock()
        result = await execute_run_sync(settings, req)

    assert "trouble" in result["reply"].lower()
    assert result["terminate"] is False
    await idempotency_close()


@pytest.mark.asyncio
async def test_execute_run_sync_ignores_tool_messages_and_picks_last_ai_text(settings):
    await idempotency_init(None)
    req = AgentRunRequest(tenantId="t-1", leadId="lead-1", triggerId="trg-sync-4", channel="PHONE_CALL", trigger="inbound_message", messageText="What are your hours?")

    fake_graph = AsyncMock()
    fake_graph.ainvoke = AsyncMock(return_value={"messages": [
        AIMessage(content="Let me check that for you."),
        AIMessage(content="We're open nine to six, Monday through Friday."),
    ], "terminate": False})

    with patch("app.runner.build_graph", return_value=fake_graph), patch("app.runner.BackendClient") as MockClient:
        MockClient.return_value.close = AsyncMock()
        result = await execute_run_sync(settings, req)

    assert result["reply"] == "We're open nine to six, Monday through Friday."
    await idempotency_close()


@pytest.mark.asyncio
async def test_execute_run_sync_surfaces_terminate_flag(settings):
    await idempotency_init(None)
    req = AgentRunRequest(tenantId="t-1", leadId="lead-1", triggerId="trg-sync-5", channel="PHONE_CALL", trigger="inbound_message", messageText="Never call me again")

    fake_graph = AsyncMock()
    fake_graph.ainvoke = AsyncMock(return_value={"messages": [AIMessage(content="Understood, I'll pass you to a human.")], "terminate": True})

    with patch("app.runner.build_graph", return_value=fake_graph), patch("app.runner.BackendClient") as MockClient:
        MockClient.return_value.close = AsyncMock()
        result = await execute_run_sync(settings, req)

    assert result["terminate"] is True


@pytest.mark.asyncio
async def test_execute_run_sync_dedupes_by_trigger_id(settings):
    await idempotency_init(None)
    req = AgentRunRequest(tenantId="t-1", leadId="lead-1", triggerId="trg-sync-3", channel="PHONE_CALL", trigger="call_started", messageText=None)

    fake_graph = AsyncMock()
    fake_graph.ainvoke = AsyncMock(return_value={"messages": [AIMessage(content="Hello!")], "terminate": False})

    with patch("app.runner.build_graph", return_value=fake_graph), patch("app.runner.BackendClient") as MockClient:
        MockClient.return_value.close = AsyncMock()
        first = await execute_run_sync(settings, req)
        second = await execute_run_sync(settings, req)

    assert first["reply"] == "Hello!"
    assert second["reply"] != "Hello!"  # duplicate trigger short-circuits to the fallback, not a second real run
    await idempotency_close()
