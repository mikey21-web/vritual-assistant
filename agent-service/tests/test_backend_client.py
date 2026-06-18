import pytest
import httpx
import respx
from app.backend_client import BackendClient, BackendError
from app.config import Settings


@pytest.fixture
def client():
    s = Settings(
        backend_api_url="http://test:3001",
        agent_service_jwt="test-key",
        anthropic_api_key="test-key",
    )
    return BackendClient(s)


@pytest.mark.asyncio
async def test_send_message(client):
    with respx.mock:
        respx.post("http://test:3001/conversations/messages").mock(
            return_value=httpx.Response(201, json={"id": "msg-1", "text": "Hello"})
        )
        r = await client.send_message("lead-1", "WHATSAPP", "Hello")
        assert r["id"] == "msg-1"
        req = respx.calls.last.request
        assert req.headers["x-service-key"] == "test-key"


@pytest.mark.asyncio
async def test_get_lead(client):
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"id": "lead-1", "status": "NEW"})
        )
        r = await client.get_lead("lead-1")
        assert r["id"] == "lead-1"


@pytest.mark.asyncio
async def test_backend_error_raises(client):
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(500, json={"message": "boom"})
        )
        with pytest.raises(BackendError) as exc:
            await client.get_lead("lead-1")
        assert "boom" in str(exc.value)


@pytest.mark.asyncio
async def test_update_status(client):
    with respx.mock:
        respx.patch("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"status": "QUALIFIED"})
        )
        r = await client.update_status("lead-1", "QUALIFIED")
        assert r["status"] == "QUALIFIED"


@pytest.mark.asyncio
async def test_create_task(client):
    with respx.mock:
        respx.post("http://test:3001/tasks").mock(
            return_value=httpx.Response(201, json={"id": "task-1", "title": "Follow up"})
        )
        r = await client.create_task("lead-1", "Follow up")
        assert r["title"] == "Follow up"


@pytest.mark.asyncio
async def test_update_custom_fields_merges(client):
    with respx.mock:
        respx.get("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"id": "lead-1", "metadata": {"phone": "+123"}})
        )
        respx.patch("http://test:3001/leads/lead-1").mock(
            return_value=httpx.Response(200, json={"metadata": {"phone": "+123", "email": "a@b.com"}})
        )
        r = await client.update_custom_fields("lead-1", {"email": "a@b.com"})
        patch_req = [c for c in respx.calls if c.request.method == "PATCH"][0]
        import json
        body = json.loads(patch_req.request.content)
        assert body["metadata"]["phone"] == "+123"
        assert body["metadata"]["email"] == "a@b.com"
