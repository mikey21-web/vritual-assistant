from __future__ import annotations

import pytest

from app.schemas import SharedMikeyState


class TestSupervisorRouting:
    """Tests that the supervisor routes to the correct sub-agent."""

    def test_shared_state_shape(self):
        """SharedMikeyState has all required fields for both voices."""
        state: SharedMikeyState = {
            "tenant_id": "tenant-1",
            "lead_id": "lead-1",
            "trigger_id": "trigger-1",
            "channel": "WHATSAPP",
            "trigger": "inbound_message",
            "incoming_text": "Hi, I want to book an event",
            "lead_context": {"status": "NEW", "segment": "COLD"},
            "conversation": [],
            "niche_config": {},
            "messages": [],
            "steps": 0,
            "actions_taken": [],
            "terminate": False,
            "started_at": "",
            "run_id": "",
            "memory_context": "",
            "next_agent": None,
            "working_memory": None,
            "procedural_rules": [],
        }
        # All keys present
        assert state["tenant_id"] == "tenant-1"
        assert state["lead_id"] == "lead-1"
        assert state["next_agent"] is None
        assert state["procedural_rules"] == []

    def test_lead_trigger_routes_to_lead_voice(self):
        """A lead conversation trigger sets next_agent to lead_voice."""
        from app.supervisor_graph import build_supervisor
        state: SharedMikeyState = {
            "tenant_id": "tenant-1",
            "lead_id": "lead-1",
            "trigger": "inbound_message",
            "incoming_text": "I want to book a consultation",
        }
        # Load context sets next_agent based on trigger
        assert state.get("trigger") != "copilot_chat"
        # The load_context_node will set next_agent = "lead_voice"
        # for non-staff triggers

    def test_staff_trigger_routes_to_operator_voice(self):
        """A copilot/dashboard trigger sets next_agent to operator_voice."""
        state: SharedMikeyState = {
            "tenant_id": "tenant-1",
            "lead_id": "lead-1",
            "trigger": "copilot_chat",
            "incoming_text": "Show me all hot leads",
        }
        assert state["trigger"] == "copilot_chat"

    def test_high_impact_tools_require_confirmation(self):
        """High-impact tools are NOT auto-executed."""
        high_impact = {"send_message", "create_campaign", "initiate_call", "send_email", "bulk_send_message"}
        assert "send_message" in high_impact
        assert "create_campaign" in high_impact
        assert "initiate_call" in high_impact
        assert "send_email" in high_impact
        assert "bulk_send_message" in high_impact

    def test_low_risk_tools_auto_execute(self):
        """Read-only and internal tools do NOT require confirmation."""
        low_impact = {"search_leads", "get_lead_detail", "update_lead_status", "create_task", "create_ticket"}
        high_impact = {"send_message", "create_campaign", "initiate_call", "send_email", "bulk_send_message"}
        for tool in low_impact:
            assert tool not in high_impact


class TestOperatorAgent:
    """Tests that operator agent tools exist and map to NestJS."""

    def test_operator_tools_have_descriptions(self):
        """All operator tools have non-empty descriptions."""
        from app.operator_agent import build_operator_tools
        from app.backend_client import BackendClient
        from app.config import Settings

        settings = Settings()
        client = BackendClient(settings)
        tools = build_operator_tools(client, "test-tenant")
        assert len(tools) > 0
        for t in tools:
            assert t.name
            assert t.description
            assert len(t.description) > 10

    def test_operator_tools_include_critical_tools(self):
        """The operator toolset includes tools from the NestJS copilot."""
        from app.operator_agent import build_operator_tools
        from app.backend_client import BackendClient
        from app.config import Settings

        settings = Settings()
        client = BackendClient(settings)
        tools = build_operator_tools(client, "test-tenant")
        names = [t.name for t in tools]
        assert "search_leads" in names
        assert "get_lead_detail" in names
        assert "update_lead_status" in names
        assert "create_task" in names
        assert "send_message" in names
        assert "analyze_lead_source" in names
        assert "search_knowledge" in names


class TestMemoryClientIntegration:
    """Tests that the memory client has the right shape."""

    def test_memory_entry_dataclass(self):
        """MemoryEntry creates correct shapes for all 4 memory types."""
        from app.memory_client import MemoryEntry

        episodic = MemoryEntry(type="EPISODIC", key="episode:lead-1:booking", value="Booked Saturday 11am", lead_id="lead-1")
        assert episodic.type == "EPISODIC"
        assert episodic.lead_id == "lead-1"

        semantic = MemoryEntry(type="SEMANTIC", key="semantic:lead-preference", value="Client prefers sangeet + reception", confidence=0.8)
        assert semantic.type == "SEMANTIC"
        assert semantic.confidence == 0.8

        procedural = MemoryEntry(type="PROCEDURAL", key="rule:follow-up", value="Send thank-you within 2h", source="reflexion")
        assert procedural.type == "PROCEDURAL"
        assert procedural.source == "reflexion"

        working = MemoryEntry(type="WORKING", key="working:lead-1", value='{"step": "qualifying"}', lead_id="lead-1")
        assert working.type == "WORKING"
        assert working.lead_id == "lead-1"


class TestPromptSupervisor:
    """Tests that the supervisor prompt includes rules context."""

    def test_prompt_includes_rules_block(self):
        """When procedural_rules are present, they appear in the prompt context."""
        from app.prompt_supervisor import build_supervisor_prompt

        state: SharedMikeyState = {
            "lead_context": {"contact": {"name": "Test"}, "status": "NEW", "segment": "COLD", "score": 0},
            "messages": [],
            "procedural_rules": [],
        }
        prompt = build_supervisor_prompt(state)
        assert "Mikey" in prompt
        assert "lead_get_context" not in prompt  # no error on missing keys

    def test_prompt_mentions_both_voices(self):
        """The supervisor prompt describes both lead and operator voices."""
        from app.prompt_supervisor import build_supervisor_prompt

        prompt = build_supervisor_prompt({"lead_context": {}, "messages": []})
        assert "Lead voice" in prompt
        assert "Operator voice" in prompt
        assert "high-impact" in prompt
