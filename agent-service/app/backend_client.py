from __future__ import annotations

from typing import Any, Coroutine
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.config import Settings


class BackendError(Exception):
    def __init__(self, status: int, message: str, endpoint: str):
        self.status = status
        self.message = message
        self.endpoint = endpoint
        super().__init__(f"Backend {endpoint}: [{status}] {message}")


class BackendClient:
    def __init__(self, settings: Settings):
        self.base = settings.backend_api_url.rstrip("/")
        self.service_key = settings.agent_service_jwt
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

    def _retry_get(self, url: str, params: dict | None = None) -> Coroutine[Any, Any, dict]:
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
            retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
            reraise=True,
        )
        async def _do_get():
            return await self._get(url, params)
        return _do_get()

    def _retry_post(self, url: str, body: dict | None = None) -> Coroutine[Any, Any, dict]:
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
            retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
            reraise=True,
        )
        async def _do_post():
            return await self._post(url, body)
        return _do_post()

    def _retry_patch(self, url: str, body: dict) -> Coroutine[Any, Any, dict]:
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
            retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
            reraise=True,
        )
        async def _do_patch():
            return await self._patch(url, body)
        return _do_patch()

    async def _get(self, path: str, params: dict | None = None) -> dict:
        r = await self.client.get(f"{self.base}{path}", params=params)
        if r.status_code >= 400:
            msg = "unknown"
            try:
                msg = r.json().get("message", r.text)
            except Exception:
                pass
            raise BackendError(r.status_code, msg, path)
        return r.json()

    async def _post(self, path: str, body: dict | None = None) -> dict:
        r = await self.client.post(f"{self.base}{path}", json=body or {})
        if r.status_code >= 400:
            msg = "unknown"
            try:
                msg = r.json().get("message", r.text)
            except Exception:
                pass
            raise BackendError(r.status_code, msg, path)
        return r.json()

    async def _patch(self, path: str, body: dict) -> dict:
        r = await self.client.patch(f"{self.base}{path}", json=body)
        if r.status_code >= 400:
            msg = "unknown"
            try:
                msg = r.json().get("message", r.text)
            except Exception:
                pass
            raise BackendError(r.status_code, msg, path)
        return r.json()

    async def get_lead(self, lead_id: str) -> dict:
        return await self._retry_get(f"/leads/{lead_id}")

    async def get_lead_timeline(self, lead_id: str) -> dict:
        return await self._retry_get(f"/leads/{lead_id}/timeline")

    async def get_conversation(self, lead_id: str) -> list:
        return await self._retry_get(f"/leads/{lead_id}/conversations")

    async def get_niche_config(self, client_key: str = "default") -> dict:
        return await self._retry_get(f"/niche-templates/client/current?clientKey={client_key}")

    async def send_message(self, lead_id: str, channel: str, text: str, template_id: str | None = None) -> dict:
        body = {
            "leadId": lead_id,
            "channel": channel,
            "direction": "OUTBOUND",
            "text": text,
        }
        if template_id:
            body["messageTemplateId"] = template_id
        return await self._retry_post("/conversations/messages", body)

    async def update_custom_fields(self, lead_id: str, fields: dict) -> dict:
        r = await self._retry_get(f"/leads/{lead_id}")
        current_meta = dict(r.get("metadata") or {})
        current_meta.update(fields)
        return await self._retry_patch(f"/leads/{lead_id}", {"metadata": current_meta})

    async def update_score(self, lead_id: str) -> dict:
        return await self._retry_post(f"/leads/{lead_id}/score")

    async def update_status(self, lead_id: str, status: str) -> dict:
        return await self._retry_patch(f"/leads/{lead_id}", {"status": status})

    async def set_segment(self, lead_id: str, segment: str) -> dict:
        return await self._retry_patch(f"/leads/{lead_id}", {"segment": segment})

    async def assign_agent(self, lead_id: str, agent_id: str | None = None) -> dict:
        body = {"agentId": agent_id} if agent_id else {}
        return await self._retry_post(f"/leads/{lead_id}/assign", body)

    async def create_task(self, lead_id: str, title: str, priority: str = "medium", due_at: str | None = None) -> dict:
        body = {"title": title, "priority": priority, "leadId": lead_id}
        if due_at:
            body["dueAt"] = due_at
        return await self._retry_post("/tasks", body)

    async def book_appointment(self, lead_id: str, booking_type: str) -> dict:
        # Creates a real Booking row (and records the APPOINTMENT_BOOKING
        # conversion server-side) so reschedule/cancel have something to act on.
        return await self._retry_post(f"/leads/{lead_id}/bookings", {"bookingType": booking_type})

    async def get_booking_availability(self, lead_id: str) -> dict:
        return await self._retry_get(f"/leads/{lead_id}/bookings/availability")

    async def reschedule_booking(self, lead_id: str, new_time: str, reason: str | None = None) -> dict:
        return await self._retry_post(f"/leads/{lead_id}/bookings/reschedule", {"newTime": new_time, "reason": reason})

    async def cancel_booking(self, lead_id: str, reason: str | None = None) -> dict:
        return await self._retry_post(f"/leads/{lead_id}/bookings/cancel", {"reason": reason})

    async def search_knowledge_base(self, query: str) -> list:
        result = await self._retry_get("/knowledge-base/search", {"q": query})
        return result if isinstance(result, list) else result.get("data", [])

    async def push_to_crm(self, lead_id: str) -> dict:
        return await self._retry_post(f"/leads/{lead_id}/conversions", {
            "destination": "CRM_QUALIFIED_PUSH",
        })

    async def record_conversion(self, lead_id: str, destination: str) -> dict:
        return await self._retry_post(f"/leads/{lead_id}/conversions", {
            "destination": destination,
        })

    async def post_run_summary(self, payload: dict) -> dict:
        return await self._retry_post("/agent/run-summary", payload)
