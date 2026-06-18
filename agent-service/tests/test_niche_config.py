from app.niche_config import normalize_niche_config, SAFE_DEFAULT_CONFIG


def test_normalize_event_marketing():
    raw = {
        "industry": "events",
        "name": "Event Marketing",
        "configSnapshot": {
            "packs": [
                {
                    "type": "custom_fields",
                    "payload": {
                        "fields": [
                            {"name": "Event Type", "key": "event_type", "type": "DROPDOWN", "options": ["Wedding","Conference"], "required": True},
                            {"name": "Budget", "key": "budget", "type": "TEXT", "required": False},
                        ]
                    }
                },
                {
                    "type": "scoring_rules",
                    "payload": {
                        "rules": [
                            {"name": "Budget rule", "field": "budget", "operator": "greater_than", "value": "5000", "points": 20}
                        ]
                    }
                },
                {
                    "type": "message_templates",
                    "payload": {
                        "templates": [
                            {"name": "Welcome", "body": "Hi! Let's plan your event."}
                        ]
                    }
                },
                {
                    "type": "conversion_goals",
                    "payload": {"goals": ["Book a consultation", "Get a quote"]}
                },
                {
                    "type": "pipeline_stages",
                    "payload": {"stages": [{"name": "New"}, {"name": "Qualified"}, {"name": "Booked"}]}
                },
                {
                    "type": "booking_settings",
                    "payload": {"providers": [{"name": "Consultation"}, {"name": "Site Visit"}]}
                },
            ]
        },
        "template": {"industry": "events", "name": "Event Marketing Agency"}
    }

    result = normalize_niche_config(raw)

    assert result["industry"] == "events"
    assert result["display_name"] == "Event Marketing Agency"
    assert len(result["fields_to_collect"]) == 2
    assert result["fields_to_collect"][0]["key"] == "event_type"
    assert len(result["scoring_signals"]) == 1
    assert "budget greater_than 5000" in result["scoring_signals"][0]
    assert len(result["tone_examples"]) == 1
    assert "plan your event" in result["tone_examples"][0]
    assert result["conversion_goals"] == ["Book a consultation", "Get a quote"]
    assert result["pipeline_stages"] == ["New", "Qualified", "Booked"]
    assert result["booking_types"] == ["Consultation", "Site Visit"]


def test_none_returns_default():
    result = normalize_niche_config(None)
    assert result["industry"] == "generic"
    assert len(result["fields_to_collect"]) > 0
    assert len(result["scoring_signals"]) > 0


def test_empty_dict_returns_default():
    result = normalize_niche_config({})
    assert result["industry"] == "generic"
    assert result["display_name"] == "Business"


def test_malformed_config_does_not_crash():
    result = normalize_niche_config({"bad": "data"})
    assert result["industry"] == "generic"
