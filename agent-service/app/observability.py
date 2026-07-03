"""
Observability helpers for the agent.
- Langfuse tracing (env-gated; no-op when LANGFUSE_* vars are not set)
- Pre-send guard node (consent + window + blocklist + PII scan)
"""

from __future__ import annotations

import re
from typing import Callable

import structlog

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Langfuse tracing (env-gated, no-op if unset)
# ---------------------------------------------------------------------------

def get_langfuse_handler(settings) -> Callable | None:
    """Return a Langfuse callback handler if configured, else None."""
    if not settings.langfuse_host or not settings.langfuse_public_key or not settings.langfuse_secret_key:
        return None
    try:
        from langfuse.callback import CallbackHandler
        handler = CallbackHandler(
            host=settings.langfuse_host,
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
        )
        logger.info("langfuse_tracing_enabled", host=settings.langfuse_host)
        return handler
    except ImportError:
        logger.warning("langfuse_tracing_disabled", reason="langfuse package not installed")
        return None


# ---------------------------------------------------------------------------
# Pre-send guard — defense-in-depth before outbound messages
# ---------------------------------------------------------------------------

PII_PATTERNS = [
    re.compile(r"\b\d{16}\b"),               # credit card number (16 digits)
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),     # SSN
    # ⚠️  Email pattern: will flag legitimate business email addresses
    # (e.g. "email us at support@example.com") and any quoted/forwarded email
    # in a conversation. If false positives become a problem, consider:
    # - allowlisting known business domains
    # - checking only the assistant's outbound text, not the full history
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),  # email
    # ⚠️  10-digit phone pattern: will flag any 10-digit number sequence such
    # as order IDs, tracking numbers, zip+4 codes, or lead IDs. Add a prefix
    # requirement (e.g. \b\d{3}[-. ]\d{3}[-. ]\d{4}\b) if formatting is known.
    re.compile(r"\b\d{10}\b"),                # 10-digit phone
]


def _has_pii(text: str) -> list[str]:
    """Scan text for common PII patterns. Returns list of matched types."""
    matches = []
    if PII_PATTERNS[0].search(text):
        matches.append("credit_card")
    if PII_PATTERNS[1].search(text):
        matches.append("ssn")
    if PII_PATTERNS[2].search(text):
        matches.append("email")
    if PII_PATTERNS[3].search(text):
        matches.append("phone")
    return matches


async def pre_send_guard(state: dict, lead_context: dict, niche_config: dict) -> dict:
    """
    Pre-send guard: checks consent, blocklist, and PII before any outbound message.
    Returns the action result: {'allowed': True/False, 'reason': str}.
    Defense-in-depth alongside backend MessagePolicyService.
    """
    contact = lead_context.get("contact") or {}
    lead = lead_context

    # 1. Consent / opt-out check
    opted_out = lead.get("optedOutAt") or contact.get("optedOutAt")
    if opted_out:
        return {"allowed": False, "reason": "opted_out"}
    consent_status = lead.get("consentStatus") or contact.get("consentStatus")
    if consent_status == "opted_out":
        return {"allowed": False, "reason": "consent_opted_out"}

    # 2. PII scan — block messages containing user PII being sent
    last_message_text = ""
    messages = state.get("messages", [])
    if messages:
        last = messages[-1]
        if hasattr(last, "content"):
            last_message_text = str(last.content)

    if last_message_text:
        pii_found = _has_pii(last_message_text)
        if pii_found:
            logger.warning("pre_send_guard_pii_blocked", pii_types=pii_found)
            return {"allowed": False, "reason": f"pii_detected: {','.join(pii_found)}"}

    return {"allowed": True, "reason": ""}
