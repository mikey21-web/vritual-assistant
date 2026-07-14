from pydantic import BaseModel
from typing import TypedDict, Any, Literal


class AgentRunRequest(BaseModel):
    tenantId: str
    leadId: str
    triggerId: str
    channel: str
    trigger: str
    messageText: str | None = None


class AgentRunResponse(BaseModel):
    accepted: bool
    runId: str


class CollectedField(BaseModel):
    key: str
    value: str


class RunSummaryPayload(BaseModel):
    runId: str
    leadId: str
    tenantId: str
    actions: list[dict]
    model: str
    startedAt: str
    finishedAt: str


class AgentState(TypedDict, total=False):
    tenant_id: str
    lead_id: str
    trigger_id: str
    channel: str
    trigger: str
    incoming_text: str | None
    lead_context: dict
    conversation: list[dict]
    niche_config: dict
    messages: list[Any]
    steps: int
    actions_taken: list[dict]
    terminate: bool
    started_at: str
    run_id: str


class SharedMikeyState(TypedDict, total=False):
    """Unified state for the Peak Mikey supervisor graph."""
    tenant_id: str
    lead_id: str
    trigger_id: str
    channel: str
    trigger: str
    incoming_text: str | None
    lead_context: dict
    conversation: list[dict]
    niche_config: dict
    messages: list[Any]
    steps: int
    actions_taken: list[dict]
    terminate: bool
    started_at: str
    run_id: str
    memory_context: str
    supervisor_decision: str
    next_agent: Literal["supervisor", "lead_voice", "operator_voice"] | None
    working_memory: dict | None
    procedural_rules: list[dict] | None
