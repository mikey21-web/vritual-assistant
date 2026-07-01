# Post-Mortem Template

> Copy this template for every incident that caused a service degradation or outage.

## Summary

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-NNN |
| **Title** | One-line description |
| **Severity** | SEV1 (full outage) / SEV2 (degraded) / SEV3 (minor) |
| **Date** | YYYY-MM-DD |
| **Duration** | Xh Ym |
| **Affected systems** | list |
| **Customer impact** | description |
| **Author** | name |

## Timeline (UTC)

- **HH:MM** — First detection (alert fired, customer report, etc.)
- **HH:MM** — On-call paged
- **HH:MM** — Acknowledged
- **HH:MM** — Investigation started
- **HH:MM** — Root cause identified
- **HH:MM** — Mitigation applied
- **HH:MM** — Service restored
- **HH:MM** — Incident closed

## Root Cause

What actually caused the incident? One paragraph explanation.

## Contributing Factors

What made the incident worse or allowed it to happen?

1. ...
2. ...

## What Went Well

- ...
- ...

## What Went Wrong

- ...
- ...

## Resolution

What did we do to fix the immediate problem?

## Prevention

What changes will prevent recurrence?

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| ...    | ...   | ...      | ...    |

## Lessons Learned

Key takeaways for the team.

## Appendix

- Logs: link
- Metrics: link
- Sentry: link
- Slack channel: #incident-...
