from app.prompt import build_system_prompt


def test_prompt_includes_fields_to_collect():
    niche = {
        "industry": "healthcare",
        "display_name": "Health Clinic",
        "fields_to_collect": [
            {"key": "treatment", "label": "Treatment Interest", "type": "TEXT", "required": True},
        ],
        "scoring_signals": ["treatment = surgery → +15"],
        "conversion_goals": ["Book consultation"],
        "pipeline_stages": ["New", "Consultation Booked"],
        "booking_types": ["Consultation"],
        "tone_examples": ["Hello, how can I help?"],
        "labels": {"lead": "Patient"},
        "compliance": ["HIPAA: do not share PHI"],
    }
    lead = {"contact": {"name": "John"}, "status": "NEW", "score": 0, "segment": "COLD"}

    prompt = build_system_prompt(niche, lead)

    assert "Health Clinic" in prompt
    assert "Treatment Interest" in prompt
    assert "surgery → +15" in prompt
    assert "Book consultation" in prompt
    assert "HIPAA" in prompt
    assert "PATIENT:" in prompt
    assert "John" in prompt


def test_prompt_includes_defaults_when_minimal():
    niche = {
        "industry": "generic",
        "display_name": "Business",
        "fields_to_collect": [],
        "scoring_signals": [],
        "conversion_goals": ["Book a call"],
        "pipeline_stages": [],
        "booking_types": ["Call"],
        "tone_examples": [],
        "labels": {},
        "compliance": [],
    }
    lead = {"contact": {}, "status": "NEW", "score": 0, "segment": "COLD"}

    prompt = build_system_prompt(niche, lead)
    assert "Business" in prompt
    assert "Book a call" in prompt


def test_prompt_defaults_to_whatsapp_wording():
    niche = {"industry": "generic", "display_name": "Business", "fields_to_collect": [], "scoring_signals": [], "conversion_goals": [], "pipeline_stages": [], "booking_types": [], "tone_examples": [], "labels": {}, "compliance": []}
    lead = {"contact": {}, "status": "NEW", "score": 0, "segment": "COLD"}

    prompt = build_system_prompt(niche, lead)
    assert "over WhatsApp" in prompt


def test_prompt_reflects_webchat_channel():
    niche = {"industry": "generic", "display_name": "Business", "fields_to_collect": [], "scoring_signals": [], "conversion_goals": [], "pipeline_stages": [], "booking_types": [], "tone_examples": [], "labels": {}, "compliance": []}
    lead = {"contact": {}, "status": "NEW", "score": 0, "segment": "COLD"}

    prompt = build_system_prompt(niche, lead, channel="CHATBOT")
    assert "the website chat widget" in prompt
    assert "over WhatsApp" not in prompt
