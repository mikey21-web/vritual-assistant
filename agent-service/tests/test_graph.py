import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage, ToolMessage
from app.graph import build_graph, _load_context, _should_continue
from app.config import Settings
from app.backend_client import BackendClient, BackendError


@pytest.fixture
def settings():
    return Settings(
        backend_api_url="http://test:3001",
        agent_service_jwt="test-jwt",
        anthropic_api_key="test-key",
        agent_max_tokens=256,
        max_agent_steps=5,
        agent_inbound_key="test-key",
    )


@pytest.mark.asyncio
async def test_load_context(settings):
    client = MagicMock(spec=BackendClient)
    client._get = AsyncMock(side_effect=[
        {"id": "lead-1", "status": "NEW", "score": 0, "segment": "COLD", "contact": {"name": "Test"}},
        [],
        {"industry": "events", "name": "Event Marketing", "configSnapshot": {"packs": []}, "template": {"industry": "events", "name": "Event Marketing Agency"}},
    ])

    state = {
        "tenant_id": "t-1",
        "lead_id": "lead-1",
        "trigger_id": "trg-1",
        "channel": "WHATSAPP",
        "trigger": "inbound_message",
        "incoming_text": "Hello",
        "run_id": "run-1",
    }

    config = {"configurable": {"settings": settings, "client": client}}
    result = await _load_context(state, config)

    assert "lead_context" in result
    assert "niche_config" in result
    assert result["niche_config"]["display_name"] == "Event Marketing Agency"
    assert len(result["messages"]) > 0
    assert isinstance(result["messages"][0].content, str)
    assert result["terminate"] is False

    niche_url = client._get.call_args_list[2][0][0]
    assert "clientKey=t-1" in niche_url


@pytest.mark.asyncio
async def test_load_context_auth_error_raises(settings):
    client = MagicMock(spec=BackendClient)
    client._get = AsyncMock(side_effect=BackendError(401, "Unauthorized", "/leads/lead-1"))

    state = {
        "tenant_id": "t-1",
        "lead_id": "lead-1",
        "trigger_id": "trg-1",
        "channel": "WHATSAPP",
        "trigger": "inbound_message",
        "incoming_text": "Hello",
        "run_id": "run-1",
    }

    config = {"configurable": {"settings": settings, "client": client}}
    with pytest.raises(BackendError):
        await _load_context(state, config)


def test_should_continue_tools(settings):
    state = {
        "messages": [AIMessage(content="", tool_calls=[{"name": "send_message", "args": {}, "id": "1"}])],
        "steps": 1,
        "terminate": False,
    }
    config = {"configurable": {"settings": settings}}
    assert _should_continue(state, config) == "tools"


def test_should_continue_terminate(settings):
    state = {
        "messages": [AIMessage(content="", tool_calls=[{"name": "send_message", "args": {}, "id": "1"}])],
        "steps": 1,
        "terminate": True,
    }
    config = {"configurable": {"settings": settings}}
    assert _should_continue(state, config) == "persist"


def test_should_continue_max_steps(settings):
    s = Settings(backend_api_url="http://test:3001", agent_service_jwt="test", max_agent_steps=10)
    state = {
        "messages": [AIMessage(content="", tool_calls=[{"name": "send_message", "args": {}, "id": "1"}])],
        "steps": 10,
        "terminate": False,
    }
    config = {"configurable": {"settings": s}}
    assert _should_continue(state, config) == "persist"


def test_should_continue_no_tools(settings):
    state = {"messages": [AIMessage(content="Hello")], "steps": 1, "terminate": False}
    config = {"configurable": {"settings": settings}}
    assert _should_continue(state, config) == "persist"


def test_build_graph():
    from unittest.mock import MagicMock
    from app.tools import build_tools, ToolContext

    client = MagicMock(spec=BackendClient)
    ctx = ToolContext(client=client, lead_id="lead-1", tenant_id="tenant-1")
    tools = build_tools(ctx)

    s = Settings(
        backend_api_url="http://test:3001",
        agent_service_jwt="test-jwt",
    )
    graph = build_graph(tools=tools, settings=s, client=client)
    assert graph is not None

    nodes = graph.get_graph().nodes
    assert "load_context" in nodes
    assert "agent" in nodes
    assert "tools" in nodes
    assert "persist" in nodes


@pytest.mark.asyncio
async def test_tool_execution_roundtrip(settings):
    from unittest.mock import MagicMock
    from app.tools import build_tools, ToolContext

    client = MagicMock(spec=BackendClient)
    send_msg_called = []

    async def fake_send_message(lead_id, channel, text, template_id=None):
        send_msg_called.append({"lead_id": lead_id, "text": text, "channel": channel})
        return {"id": "msg-1"}

    client.send_message = AsyncMock(side_effect=fake_send_message)
    client.post_run_summary = AsyncMock(return_value={"recorded": True})

    ctx = ToolContext(client=client, lead_id="lead-1", tenant_id="tenant-1")
    tools = build_tools(ctx)

    send_msg_tool = next(t for t in tools if t.name == "send_message")
    result = await send_msg_tool.ainvoke({"text": "Hello!"})
    assert result.startswith("ok:")
    assert len(send_msg_called) == 1
    assert send_msg_called[0]["text"] == "Hello!"
    assert send_msg_called[0]["lead_id"] == "lead-1"


@pytest.mark.asyncio
async def test_graph_compiles_and_runs_load_context_only(settings):
    from unittest.mock import MagicMock
    from app.tools import build_tools, ToolContext

    client = MagicMock(spec=BackendClient)
    client._get = AsyncMock(side_effect=[
        {"id": "lead-1", "status": "NEW", "score": 0, "segment": "COLD", "contact": {"name": "Test"}},
        [],
        {"industry": "test", "name": "Test", "configSnapshot": {"packs": []}, "template": {"industry": "test", "name": "Test"}},
    ])

    ctx = ToolContext(client=client, lead_id="lead-1", tenant_id="tenant-1")
    tools = build_tools(ctx)

    graph = build_graph(tools=tools, settings=settings, client=client)
    state = {
        "tenant_id": "t-1",
        "lead_id": "lead-1",
        "trigger_id": "trg-1",
        "channel": "WHATSAPP",
        "trigger": "lead_created",
        "incoming_text": None,
        "run_id": "run-1",
    }

    config = {"configurable": {"settings": settings, "client": client, "tools": tools}}

    result = await _load_context(state, config)
    assert "lead_context" in result
    assert "niche_config" in result
    assert len(result["messages"]) > 0
    assert any("A new lead was created" in str(m.content) for m in result["messages"])
