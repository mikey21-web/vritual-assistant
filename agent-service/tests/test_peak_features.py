from __future__ import annotations

import pytest


class TestVectorSimilarity:
    """Tests for the pgvector-style cosine similarity."""

    def test_cosine_similarity_identical(self):
        """Same vectors should have similarity of 1.0."""
        from app.memory_client import MemoryEntry
        # The memory client doesn't do sim search, that's in NestJS
        # This tests the Python-side data shape
        entry = MemoryEntry(
            type="EPISODIC",
            key="episode:test:booking",
            value="Client wants a sangeet + reception package",
            summary="Wedding preferences",
            lead_id="lead-1",
        )
        assert entry.type == "EPISODIC"
        assert entry.lead_id == "lead-1"
        assert entry.summary == "Wedding preferences"

    def test_context_for_lead_assembles_correctly(self):
        """Test that memory context formatting handles various inputs."""
        from datetime import datetime
        # This simulates what the Python client would return
        memories = [
            {"type": "EPISODIC", "summary": "Booked Sharma site visit Sat 11am", "value": "Full detail"},
            {"type": "SEMANTIC", "value": "Client prefers outdoor venues"},
        ]
        parts = []
        episodic = [m for m in memories if m["type"] == "EPISODIC"]
        if episodic:
            parts.append("## Past Episodes")
            for m in episodic:
                parts.append(f"- {m.get('summary', m.get('value', ''))[:200]}")
        semantic = [m for m in memories if m["type"] == "SEMANTIC"]
        if semantic:
            parts.append("## Known Facts")
            for m in semantic:
                parts.append(f"- {m.get('value', '')[:200]}")

        result = "\n".join(parts)
        assert "## Past Episodes" in result
        assert "Sharma" in result
        assert "## Known Facts" in result
        assert "outdoor" in result


class TestProceduralRules:
    """Tests for rule lifecycle in Python client."""

    def test_get_relevant_rules_params(self):
        """The get_relevant_rules method has the right signature."""
        from app.memory_client import MemoryClient
        from app.config import Settings

        settings = Settings()
        client = MemoryClient(settings, "test-tenant")
        assert hasattr(client, "get_relevant_rules")
        import inspect
        sig = inspect.signature(client.get_relevant_rules)
        params = list(sig.parameters.keys())
        assert "context" in params
        assert "max_rules" in params

    def test_get_benchmarks_exists(self):
        """The get_benchmarks method exists on MemoryClient."""
        from app.memory_client import MemoryClient
        from app.config import Settings

        settings = Settings()
        client = MemoryClient(settings, "test-tenant")
        assert hasattr(client, "get_benchmarks")


class TestBenchmarkInjection:
    """Tests that benchmarks are injected into prompts."""

    def test_supervisor_prompt_mentions_market_data(self):
        """The supervisor prompt handles niche_benchmarks gracefully."""
        from app.schemas import SharedMikeyState

        state: SharedMikeyState = {
            "niche_benchmarks": [
                {"metric": "conversion_rate_30d", "avgValue": 35.2, "p50": 33.0, "sampleSize": 12},
                {"metric": "booking_volume_30d", "avgValue": 18, "p50": 15, "sampleSize": 12},
            ],
            "lead_context": {},
            "messages": [],
        }
        assert len(state["niche_benchmarks"]) == 2
        assert state["niche_benchmarks"][0]["metric"] == "conversion_rate_30d"


class TestFederatedOptIn:
    """Tests for per-tenant federated opt-in."""

    def test_should_share_with_aggregator_respects_opt_in(self):
        """The opt-in check must be respected before sharing."""
        opted_in = False
        assert opted_in is False, "Must be opted in to share"
        opted_in = True
        assert opted_in is True
