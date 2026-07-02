"""Tests for agent observability module."""

from app.observability import pre_send_guard, get_langfuse_handler


class FakeSettings:
    langfuse_host = None
    langfuse_public_key = None
    langfuse_secret_key = None


class MockMessage:
    def __init__(self, content: str):
        self.content = content


def test_langfuse_noop_when_unconfigured():
    """When LANGFUSE_* env vars are not set, get_langfuse_handler returns None."""
    settings = FakeSettings()
    handler = get_langfuse_handler(settings)
    assert handler is None


def test_pre_send_guard_allows_clean_message():
    """A message with no PII, from an opted-in contact, should be allowed."""
    state = {"messages": [MockMessage("Hi! Would you like to schedule a visit?")]}
    lead_context = {"contact": {"consentStatus": "opted_in", "optedOutAt": None}}
    result = pre_send_guard(state, lead_context, {})
    # This is a sync function in tests, but we call it normally
    import asyncio
    result = asyncio.run(pre_send_guard(state, lead_context, {}))
    assert result["allowed"] is True


def test_pre_send_guard_blocks_opted_out():
    """An opted-out contact should have messages blocked."""
    state = {"messages": [MockMessage("Hello!")]}
    lead_context = {"contact": {"consentStatus": "opted_out", "optedOutAt": "2026-01-01T00:00:00Z"}}
    import asyncio
    result = asyncio.run(pre_send_guard(state, lead_context, {}))
    assert result["allowed"] is False
    assert "opted_out" in result["reason"]


def test_pre_send_guard_blocks_pii():
    """Messages containing PII (email, phone) should be blocked."""
    state = {"messages": [MockMessage("My email is test@example.com and phone is 1234567890")]}
    lead_context = {"contact": {"consentStatus": "opted_in", "optedOutAt": None}}
    import asyncio
    result = asyncio.run(pre_send_guard(state, lead_context, {}))
    assert result["allowed"] is False
    assert "pii_detected" in result["reason"]
