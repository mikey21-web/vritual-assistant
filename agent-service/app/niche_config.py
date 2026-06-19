import os
import json
from pathlib import Path


SAFE_DEFAULT_CONFIG = {
    "industry": "generic",
    "display_name": "Business",
    "fields_to_collect": [
        {"key": "name", "label": "Name", "type": "TEXT", "options": [], "required": True},
        {"key": "email", "label": "Email", "type": "TEXT", "options": [], "required": False},
        {"key": "phone", "label": "Phone", "type": "TEXT", "options": [], "required": False},
        {"key": "intent", "label": "What they need", "type": "TEXT", "options": [], "required": True},
        {"key": "budget", "label": "Budget range", "type": "TEXT", "options": [], "required": False},
        {"key": "timeline", "label": "When they need it", "type": "TEXT", "options": [], "required": False},
    ],
    "scoring_signals": [
        "Mentions specific budget → +20",
        "Seems urgent (needs it this week) → +15",
        "Provides detailed requirements → +10",
        "Asks about pricing → +5",
    ],
    "conversion_goals": ["Book a consultation call", "Schedule a demo"],
    "pipeline_stages": ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"],
    "booking_types": ["Consultation", "Demo"],
    "tone_examples": [
        "Hi {name}! Thanks for reaching out. How can I help you today?",
        "I'd love to understand more about what you're looking for. Could you tell me a bit about your needs?",
        "Great — let me check availability and get back to you shortly.",
    ],
    "labels": {"lead": "Lead", "leads": "Leads"},
    "compliance": [],
}


def normalize_niche_config(raw: dict | None) -> dict:
    if not raw or not isinstance(raw, dict):
        return SAFE_DEFAULT_CONFIG

    cfg = raw.get("config") or raw.get("configSnapshot") or raw
    if isinstance(cfg, str):
        import json
        try:
            cfg = json.loads(cfg)
        except Exception:
            return SAFE_DEFAULT_CONFIG

    template = raw.get("template") or {}
    packs = cfg.get("packs") or cfg.get("templatePacks") or []

    fields = []
    scoring_signals = []
    tone_examples = []
    goals = []
    stages = []
    booking_types = []
    labels = {}
    compliance = []

    for pack in packs:
        ptype = pack.get("type") or pack.get("packType", "")
        payload = pack.get("payload") or pack.get("data") or {}

        if ptype in ("custom_fields", "customFields", "CUSTOM_FIELDS"):
            for f in (payload.get("fields") or []):
                fields.append({
                    "key": f.get("key") or f.get("name", "").lower().replace(" ", "_"),
                    "label": f.get("label") or f.get("name", ""),
                    "type": f.get("type", "TEXT"),
                    "options": f.get("options", []),
                    "required": f.get("required", False),
                })
        elif ptype in ("scoring_rules", "scoringRules", "SCORING_RULES"):
            for rule in (payload.get("rules") or []):
                scoring_signals.append(
                    f"{rule.get('field')} {rule.get('operator')} {rule.get('value')} → +{rule.get('points', 0)}"
                )
        elif ptype in ("message_templates", "messageTemplates", "MESSAGE_TEMPLATES"):
            for tpl in (payload.get("templates") or []):
                body = tpl.get("body") or tpl.get("text") or ""
                if body and isinstance(body, str):
                    tone_examples.append(body[:300])
        elif ptype in ("conversion_goals", "conversionGoals", "CONVERSION_GOALS"):
            goals = payload.get("goals") or payload.get("items") or []
        elif ptype in ("pipeline_stages", "pipelineStages", "PIPELINE_STAGES"):
            stages = [s.get("name", "") for s in (payload.get("stages") or [])]
        elif ptype in ("booking_settings", "bookingSettings", "BOOKING_SETTINGS"):
            booking_types = [b.get("name") or b.get("provider", "Consultation") for b in (payload.get("providers") or payload.get("settings") or [{"name": "Consultation"}])]
        elif ptype == "labels" or ptype == "LABELS":
            labels = payload

    if not fields:
        fields = SAFE_DEFAULT_CONFIG["fields_to_collect"]
    if not scoring_signals:
        scoring_signals = SAFE_DEFAULT_CONFIG["scoring_signals"]
    if not tone_examples:
        tone_examples = SAFE_DEFAULT_CONFIG["tone_examples"]
    if not goals:
        goals = SAFE_DEFAULT_CONFIG["conversion_goals"]
    if not stages:
        stages = SAFE_DEFAULT_CONFIG["pipeline_stages"]
    if not booking_types:
        booking_types = SAFE_DEFAULT_CONFIG["booking_types"]

    return {
        "industry": template.get("industry") or raw.get("industry", "generic"),
        "display_name": template.get("name") or raw.get("name", "Business"),
        "fields_to_collect": fields,
        "scoring_signals": scoring_signals,
        "conversion_goals": goals,
        "pipeline_stages": stages,
        "booking_types": booking_types,
        "tone_examples": tone_examples[:5],
        "labels": labels or SAFE_DEFAULT_CONFIG["labels"],
        "compliance": compliance or SAFE_DEFAULT_CONFIG["compliance"],
    }


def load_niche_config_from_file() -> dict:
    """
    Load the niche configuration from the local YAML file.

    In single-tenant deployments, the niche.config.yaml is mounted
    as a read-only volume at /app/niche.config.yaml.

    Falls back to NICHE_CONFIG_PATH env var, then SAFE_DEFAULT_CONFIG.
    """
    import yaml

    paths = [
        os.environ.get("NICHE_CONFIG_PATH", ""),
        "/app/niche.config.yaml",
        "/app/niche.config.yml",
        str(Path(__file__).parent.parent / "niche.config.yaml"),
        str(Path(__file__).parent.parent / "niche.config.yml"),
    ]

    for path in paths:
        if not path:
            continue
        try:
            with open(path, "r") as f:
                data = yaml.safe_load(f)
                if data and isinstance(data, dict):
                    return normalize_niche_config({"packs": data.get("packs", []), **data})
        except (FileNotFoundError, PermissionError, yaml.YAMLError):
            continue

    return SAFE_DEFAULT_CONFIG
