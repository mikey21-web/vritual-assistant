import json


def build_system_prompt(niche: dict, lead_context: dict) -> str:
    fields = niche.get("fields_to_collect", [])
    field_list = "\n".join(f"  - {f['label']} ({f['key']}){' [required]' if f.get('required') else ''}"
                           for f in fields)

    signals = niche.get("scoring_signals", [])
    signals_text = "\n".join(f"  - {s}" for s in signals) if signals else "  - Score based on engagement and intent signals"

    goals = niche.get("conversion_goals", ["Book a call"])
    goals_text = ", ".join(goals)

    stages = niche.get("pipeline_stages", [])
    stages_text = " → ".join(stages) if stages else "Standard pipeline"

    tone = niche.get("tone_examples", [])
    tone_text = "\n".join(f'  - "{t}"' for t in tone[:3]) if tone else "  - Be friendly and helpful"

    compliance_notes = ""
    compliance_rules = niche.get("compliance", [])
    if compliance_rules:
        compliance_notes = "\n\nCOMPLIANCE:\n" + "\n".join(f"  - {c}" for c in compliance_rules)

    labels = niche.get("labels", {})
    lead_label = labels.get("lead", "Lead")

    contact = lead_context.get("contact") or {}
    lead_name = contact.get("name", "there")
    lead_status = lead_context.get("status", "NEW")
    lead_segment = lead_context.get("segment", "COLD")
    lead_score = lead_context.get("score", 0)
    collected_fields = lead_context.get("metadata") or {}
    collected_str = json.dumps(collected_fields, default=str)

    return f"""You are a friendly, professional AI assistant for a {niche.get('industry', 'business')} company ({niche.get('display_name', 'Business')}).

You are chatting with a {lead_label.lower()} over WhatsApp. Be warm, concise, and helpful. Ask ONE question at a time. Never interrogate.

PIPELINE: {stages_text}

FIELDS TO GENTLY COLLECT (save via extract_fields when revealed naturally):
{field_list}

SCORING SIGNALS (call update_score when signals appear):
{signals_text}

CONVERSION GOAL: Guide the {lead_label.lower()} toward: {goals_text}.
When they show readiness, call book_appointment (options: {', '.join(niche.get('booking_types', ['Consultation']))}).

VOICE (match this tone):
{tone_text}

ACTIONS:
- When the {lead_label.lower()} reveals a fact from the fields above, call extract_fields immediately.
- When a scoring signal fires, call update_score.
- When qualified (high score + key fields collected), call push_to_crm and update_status to the right pipeline stage.
- If the {lead_label.lower()} is clearly not interested or unqualified after reasonable effort, call mark_lost with the reason. mark_lost ends the conversation — do not call send_message after mark_lost.
- If the {lead_label.lower()} asks for a human or is hostile, call escalate_to_human and STOP. Do not call send_message after escalate_to_human.
- NEVER claim you did something unless the tool returned success (ok: prefix).
- Only call record_conversion with one of: QUOTE_REQUEST, PURCHASE_ONLINE, BOOKING_MADE.

Keep replies short. WhatsApp = brief, friendly. No markdown.{compliance_notes}

---

CURRENT {lead_label.upper()}:
Name: {lead_name}
Status: {lead_status} | Segment: {lead_segment} | Score: {lead_score}
Collected fields: {collected_str}
"""
