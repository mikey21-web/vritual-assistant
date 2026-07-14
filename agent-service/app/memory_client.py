from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import Settings


class MemoryError(Exception):
    pass


@dataclass
class MemoryEntry:
    type: str  # WORKING | EPISODIC | SEMANTIC | PROCEDURAL
    key: str
    value: str
    summary: str | None = None
    source: str | None = None
    lead_id: str | None = None
    confidence: float = 0.5
    metadata: dict | None = None


class MemoryClient:
    def __init__(self, settings: Settings, tenant_id: str):
        self.base = settings.backend_api_url.rstrip("/")
        self.service_key = settings.agent_service_jwt
        self.tenant_id = tenant_id
        self.timeout = settings.request_timeout_seconds
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers={
                "x-service-key": self.service_key,
                "Content-Type": "application/json",
            },
        )

    async def close(self):
        await self.client.aclose()

    def _url(self, path: str) -> str:
        return f"{self.base}/mikey/memory{path}"

    async def store(self, entry: MemoryEntry) -> dict | None:
        try:
            r = await self.client.post(
                self._url("/store"),
                json={
                    "tenantId": self.tenant_id,
                    "type": entry.type,
                    "key": entry.key,
                    "value": entry.value,
                    "summary": entry.summary,
                    "source": entry.source,
                    "leadId": entry.lead_id,
                    "confidence": entry.confidence,
                    "metadata": entry.metadata or {},
                },
            )
            if r.is_success:
                return r.json()
            return None
        except Exception:
            return None

    async def store_episodic(self, lead_id: str, event: str, metadata: dict | None = None) -> dict | None:
        return await self.store(MemoryEntry(
            type="EPISODIC",
            key=f"episode:{lead_id}:{event[:60]}",
            value=event,
            source="lead_voice",
            lead_id=lead_id,
            metadata=metadata,
        ))

    async def store_semantic(self, key: str, fact: str, confidence: float = 0.5) -> dict | None:
        return await self.store(MemoryEntry(
            type="SEMANTIC",
            key=f"semantic:{key}",
            value=fact,
            confidence=confidence,
            source="system",
        ))

    async def query(self, type: str | None = None, key: str | None = None,
                    lead_id: str | None = None, search: str | None = None,
                    limit: int = 20) -> list[dict]:
        params: dict[str, Any] = {"tenantId": self.tenant_id}
        if type:
            params["type"] = type
        if key:
            params["key"] = key
        if lead_id:
            params["leadId"] = lead_id
        if search:
            params["search"] = search
        if limit:
            params["limit"] = limit

        try:
            r = await self.client.get(self._url("/query"), params=params)
            if r.is_success:
                data = r.json()
                return data if isinstance(data, list) else data.get("data", [])
            return []
        except Exception:
            return []

    async def recall_recent(self, type: str, limit: int = 10) -> list[dict]:
        try:
            r = await self.client.get(
                self._url(f"/recent/{type}"),
                params={"tenantId": self.tenant_id, "limit": limit},
            )
            if r.is_success:
                data = r.json()
                return data if isinstance(data, list) else data.get("data", [])
            return []
        except Exception:
            return []

    async def get_context_for_lead(self, lead_id: str, max_results: int = 10) -> str:
        episodic = await self.query(type="EPISODIC", lead_id=lead_id, limit=max_results // 2)
        semantic = await self.query(type="SEMANTIC", search=lead_id, limit=max_results // 2)
        recent = await self.recall_recent("EPISODIC", limit=3)

        parts = []
        if episodic:
            parts.append("## Past Episodes")
            for m in episodic:
                parts.append(f"- {m.get('summary', m.get('value', ''))[:200]}")
        if semantic:
            parts.append("## Known Facts")
            for m in semantic:
                parts.append(f"- {m.get('value', '')[:200]}")
        if recent:
            parts.append("## Recent Activity")
            for m in recent:
                parts.append(f"- [{m.get('type', '')}] {m.get('summary', '')[:200]}")

        return "\n".join(parts) if parts else "No memory context available."

    async def propose_rule(self, rule: str, rationale: str, category: str = "general") -> dict | None:
        try:
            r = await self.client.post(
                self._url("/rules/propose"),
                json={
                    "tenantId": self.tenant_id,
                    "rule": rule,
                    "rationale": rationale,
                    "category": category,
                },
            )
            return r.json() if r.is_success else None
        except Exception:
            return None

    async def get_active_rules(self, category: str | None = None) -> list[dict]:
        params: dict[str, Any] = {"tenantId": self.tenant_id}
        if category:
            params["category"] = category
        try:
            r = await self.client.get(self._url("/rules/active"), params=params)
            if r.is_success:
                data = r.json()
                return data if isinstance(data, list) else data.get("data", [])
            return []
        except Exception:
            return []

    async def log_reflexion(self, outcome_type: str, entity_id: str | None,
                            trajectory: list, reflection: str,
                            candidate_rule: str | None = None,
                            perspectives: dict | None = None) -> dict | None:
        try:
            r = await self.client.post(
                self._url("/reflexion/log"),
                json={
                    "tenantId": self.tenant_id,
                    "outcomeType": outcome_type,
                    "entityId": entity_id,
                    "trajectory": trajectory,
                    "reflection": reflection,
                    "candidateRule": candidate_rule,
                    "perspectives": perspectives or {},
                },
            )
            return r.json() if r.is_success else None
        except Exception:
            return None
