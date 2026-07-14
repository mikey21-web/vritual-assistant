# Peak Mikey — Build Spec (for DeepSeek to build, Claude to review)

> This is the "total peak" architecture, beyond the 5 wiring phases in
> `.claude/plans/stateless-fluttering-narwhal.md`. Those 5 phases make Mikey
> *work*. This spec makes Mikey *exceptional*. Build the 5 phases first — a
> broken Mikey can't be great — then build these in order. Every decision here
> is grounded in 2026 frontier research (sources at the bottom).

## Current reality (what exists today)

- **Two separate brains that don't share a mind.** Python LangGraph agent
  (`agent-service/`) answers leads 24/7 on WhatsApp; NestJS copilot
  (`backend/src/copilot/`) is the dashboard Mikey. They share DeepSeek + the
  Khoj store, but **no reasoning, no session, no working memory**. They're
  strangers using the same database.
- **Polling, not thinking.** `mikey-scheduler.service.ts` runs a fixed
  heuristic checklist every 5 min. No hypotheses, no causal reasoning.
- **Memory is bolt-on RAG.** Khoj is best-effort semantic recall of static
  seed docs. No episodic/procedural memory. `meta-cycle.service.ts` records
  "decisions" but reads them back to nobody.
- **Single-tenant islands.** Each of the 6 deployments knows only itself. The
  one unfair advantage (running many businesses per niche) is untapped.
- **DeepSeek V3 (`deepseek-chat`)** is a generation behind for agentic tool use
  (malformed JSON, partial/empty tool calls). See model note below.

## The five peak pillars

---

### P1 — One brain: unify the two agents under a LangGraph supervisor

**Goal:** Mikey the operator and Mikey the lead-answerer become one mind with
shared working memory and shared checkpointed state. When the channel agent
books a lead at 2am, the operator *knows it in the same reasoning context* the
next morning, not as an event that flew past.

**Build:**
- Adopt the LangGraph **supervisor pattern**: one supervisor graph routes to
  two specialist sub-agents — `lead_voice` (existing channel agent) and
  `operator_voice` (port the NestJS copilot's ~25 tools into a Python graph
  node). Supervisor decides *what*; deterministic Python decides *how/when to
  stop* (this kills ~90% of infinite loops).
- **One shared state schema** across both sub-agents. Mismatched schemas are
  the #1 multi-agent integration failure — define it before writing nodes.
- Move the copilot's confirmation gating to LangGraph **`interrupt_before`** on
  high-impact nodes (send/bulk/call/email/payment). This is the standard
  enterprise HITL mechanism, not a custom in-memory `pendingActions` Map.
- Keep NestJS as the **tool/data API layer** (the sub-agents call it over HTTP
  as they do today via `backend_client.py`); NestJS stops being a second brain
  and becomes Mikey's hands.

**Why:** LangGraph 1.0 supervisor + subgraphs inherit checkpointing/HITL
automatically. Klarna/Uber/JPM run this pattern in prod. See sources.

**Review checkpoint (Claude):** verify a single `StateGraph`, one shared state
TypedDict, supervisor is a router not a doer, and no reasoning lives in NestJS
anymore.

---

### P2 — Durable execution: Mikey runs for hours/days and never loses its place

**Goal:** Mikey can pursue a goal over days, survive restarts, and pause for
your approval mid-thought without losing work.

**Build:**
- Add a LangGraph **`PostgresSaver` checkpointer** (they already run Postgres).
  State snapshots after every node; on crash/restart/approval-pause it resumes
  exactly where it left off.
- Use `interrupt_before`/`interrupt_after` for the approval queue (Phase 1 of
  the wiring plan becomes durable here — approvals survive restarts natively).
- Threads keyed per tenant + per long-running goal.

**Why:** checkpointing cuts wasted processing 60%+ on multi-step work and is the
precondition for any goal that spans more than one request. LangGraph
checkpointing handles app-level failures; if infra-level durability is needed
later, add Temporal, but do NOT start there.

**Review checkpoint:** kill the container mid-goal, confirm it resumes; confirm
approvals persist across restart.

---

### P3 — Real memory: four-type memory, not bolt-on RAG

**Goal:** Mikey never forgets, and gets *more* useful over time by extracting
facts and lessons, not hoarding transcripts.

**Build the four standard memory types** (2026 converged taxonomy):
- **Working** — current LangGraph state / context window (already have).
- **Episodic** — specific past events with timestamps ("booked Sharma site
  visit, Sat 11am, 2026-07-12"). Store in Postgres + **pgvector**, each fact
  carrying `valid_at`/`invalid_at` so Mikey can answer "what was true on
  Wednesday" without hallucinating (Zep/Graphiti temporal pattern).
- **Semantic** — extracted, deduped facts/preferences ("this client always
  wants sangeet + reception", "JustDial leads convert 3x worse"). Extraction on
  write, not verbatim dump (verbatim = noisy, unretrievable).
- **Procedural** — Mikey's own learned playbook rules (feeds P4). This is the
  least-served memory type across the whole industry — building it well is a
  genuine edge.
- **Ingest real conversation history** into episodic/semantic on every message
  persist (replace the static Khoj seed). Retrieval = tiered: small always-in-
  context core + vector retrieval + explicit forgetting/staleness policy
  (memory accuracy decays ~38% staleness/30 days if you never prune).

**Pragmatic implementation:** don't hard-adopt a vendor. Postgres + pgvector +
a `mikey_memory` table with a `type` enum (episodic/semantic/procedural) +
temporal columns covers all four and stays self-hosted. Optionally wrap Mem0
(semantic, ~48k stars, self-hostable) if extraction quality lags.

**Review checkpoint:** ask Mikey to recall a real past promise; verify it pulls
from episodic memory with correct timestamp, not a hallucination.

---

### P4 — Self-improvement: Mikey rewrites its own playbook and measures itself

**Goal:** Mikey doesn't just surface a lesson (wiring-plan Phase 3 does that) —
it *changes its own behavior*, permanently, and measures whether that helped.

**Build a Reflexion-style loop** (the most production-deployable RSI form — no
retraining, just LLM + memory + eval):
1. After an outcome is known (lead converted/lost, campaign result), Mikey
   writes a natural-language post-mortem of what it did and why.
2. Extract a candidate **procedural rule** by contrasting successful vs failed
   trajectories (ExpeL pattern), e.g. "send thank-you within 2h → +40% convert".
3. **Human-approve the rule before it goes live** (critical: self-evolving
   memory is a persistent attack/poisoning surface — "Zombie Agents". Never let
   Mikey silently rewrite its own operating rules).
4. Store approved rules in **procedural memory**; inject only the
   *context-relevant* rules into future prompts (retrieve by relevance — do NOT
   concatenate all rules into every prompt; that scales terribly).
5. **Multi-perspective reflection** to avoid tunnel vision: reflect from 2-3
   angles (a "skeptic" + an "optimizer") rather than one self-reinforcing view.
6. Close the loop: track each rule's live impact; auto-retire rules that stop
   helping.

**Wire this into `meta-cycle.service.ts`** (currently self-referential — this
gives it a purpose and an audience).

**Review checkpoint:** confirm a new rule requires approval, appears in a "what
Mikey learned" surface, measurably changes a later prompt, and gets retired if
impact goes negative.

---

### P5 — The moat: privacy-safe cross-deployment intelligence

**Goal:** the one thing no competitor can copy. Because diyaa runs many
businesses per niche, Mikey can tell one owner "event agencies like yours are
booking 30% more sangeet this season and you're underpriced" — market
intelligence a solo owner has never had.

**Build federated aggregation + differential privacy** (the standard PET stack
for cross-tenant SaaS benchmarking; there's even a granted US patent on exactly
this):
- Each deployment computes local aggregate metrics (conversion by
  source/season, avg deal value, response times, booking volume by event type)
  and pushes **only DP-noised aggregates** to a central aggregator. **Raw
  tenant data never leaves the deployment.** DP-FL with secure aggregation:
  1-5% accuracy cost, formal privacy guarantee, defense-in-depth.
- **Small-cohort guard (non-negotiable):** only surface a benchmark for a niche
  when the cohort has >= N participating tenants (DP guarantees are weak for
  small N; pick N>=5, ideally more). Below threshold, show nothing.
- Mikey pulls niche benchmarks into its context so its advice is grounded in
  the whole market, not one island.
- Per-tenant opt-in; GDPR/DPDP "privacy-by-design" posture.

**Review checkpoint:** confirm raw data never crosses the boundary (only
aggregates), the small-cohort threshold is enforced, and DP noise is applied
before egress.

---

## Cross-cutting: upgrade the model

DeepSeek V3 (`deepseek-chat`) is a generation behind for agentic tool use —
known malformed-JSON / partial / empty tool-call failures, exactly the
structured-output weaknesses V3.1/V3.2 were post-trained to fix. **Move the
agent loops to DeepSeek V3.2** (current agentic workhorse) before leaning hard
on multi-tool chains. Note: on V3.1 tool-use and thinking mode are mutually
exclusive; V3.2 adds "thinking with tools" — build against V3.2's chat
template. This single change materially reduces tool-call failures across P1-P5.

## Build order & risk

1. Model upgrade to V3.2 (small, de-risks everything downstream).
2. P3 memory schema (foundation everything else reads/writes).
3. P1 unified supervisor + P2 durable execution (the big architectural lift —
   do together, start with 1 supervisor + 2 specialists, validate routing and
   shared-state handoff before adding anything).
4. P4 self-improvement (needs P3 procedural memory).
5. P5 cross-deployment moat (independent; highest strategic value, can run in
   parallel once P3 aggregation hooks exist).

**Biggest risk:** P1 (merging two brains) is a real migration, not a wiring fix.
Keep NestJS as the tool API; only the *reasoning* moves. Ship behind a flag,
run old + new in shadow before cutover.

## How Claude reviews DeepSeek's build

For each pillar: (a) does it match the review checkpoint above; (b) is state
shared/durable/persisted (no new in-memory Maps); (c) are high-impact actions
HITL-gated; (d) for P5, is the privacy boundary provably intact. I run the
`verify` + `code-review` skills against each PR and drive the real flow end to
end, not just tests.

---

## Sources (2026 frontier)

- Agent memory taxonomy & frameworks (Mem0/Letta/Zep/LangMem, four memory
  types, procedural gap): https://jobsbyculture.com/blog/ai-agent-memory-systems-guide-2026 ,
  https://hermesos.cloud/blog/ai-agent-memory-systems ,
  https://atlan.com/know/best-ai-agent-memory-frameworks-2026/
- Self-improving agents (Reflexion, ExpeL, multi-agent reflection, poisoning
  risk): https://o-mega.ai/articles/self-improving-ai-agents-the-2026-guide ,
  https://yoheinakajima.com/better-ways-to-build-self-improving-ai-agents/ ,
  https://arxiv.org/html/2603.24639
- Privacy-preserving cross-tenant benchmarking (DP-FL, secure aggregation,
  small-cohort caveat): https://www.preprints.org/manuscript/202601.1025 ,
  https://arxiv.org/html/2504.17703v3 , US patent "Differential privacy
  security for benchmarking"
- LangGraph durable execution / supervisor / HITL:
  https://github.com/langchain-ai/langgraph ,
  https://appscale.blog/en/blog/durable-execution-llm-agents-temporal-langgraph-checkpointing-2026 ,
  https://www.lifetideshub.com/langgraph-supervisor-patterns-2026/
- DeepSeek agentic reliability (V3 vs V3.1/V3.2 tool-calling):
  https://fireworks.ai/blog/deepseek-models ,
  https://huggingface.co/deepseek-ai/DeepSeek-V3.2
- Ambient/proactive event-driven agents:
  https://zbrain.ai/ambient-agents/ ,
  https://slack.com/blog/productivity/proactive-ai-agents-definition-core-components-and-business-value
