# Permission Matrix

## Role Hierarchy
```
OWNER > ADMIN > MANAGER > SALES_AGENT / SUPPORT_AGENT > VIEWER
```

## Endpoint Access Matrix

| Module | Endpoint | OWNER | ADMIN | MANAGER | SALES_AGENT | SUPPORT_AGENT | VIEWER | Public |
|--------|----------|-------|-------|---------|-------------|---------------|--------|--------|
| **Auth** | POST /auth/login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | POST /auth/register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | GET /auth/me | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| **Users** | GET /users | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /users | ✅ | ✅ | - | - | - | - | - |
| | PATCH /users/:id | ✅ | ✅ | - | - | - | - | - |
| | DELETE /users/:id | ✅ | - | - | - | - | - | - |
| **Business** | GET /business-settings | ✅ | ✅ | ✅ | - | - | - | - |
| | PATCH /business-settings | ✅ | ✅ | - | - | - | - | - |
| **Contacts** | GET /contacts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| | POST /contacts | ✅ | ✅ | ✅ | ✅ | - | - | - |
| | PATCH /contacts/:id | ✅ | ✅ | ✅ | ✅ | - | - | - |
| **Leads** | GET /leads | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| | POST /leads | ✅ | ✅ | ✅ | ✅ | - | - | - |
| | PATCH /leads/:id | ✅ | ✅ | ✅ | ✅ | - | - | - |
| | POST /leads/:id/score | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /leads/:id/assign | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /leads/:id/spam | ✅ | ✅ | ✅ | ✅ | - | - | - |
| **Campaigns** | GET /campaigns | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| | POST /campaigns | ✅ | ✅ | ✅ | - | - | - | - |
| | PATCH /campaigns/:id | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /campaigns/:id/pause | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /campaigns/:id/activate | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /campaigns/:id/duplicate | ✅ | ✅ | ✅ | - | - | - | - |
| **Forms** | GET /forms | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /forms | ✅ | ✅ | ✅ | - | - | - | - |
| | PATCH /forms/:id | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /forms/:id/submit | - | - | - | - | - | - | ✅ |
| **QR Codes** | GET /qr-codes | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /qr-codes | ✅ | ✅ | ✅ | - | - | - | - |
| | PATCH /qr-codes/:id | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /qr-codes/:id/scan | - | - | - | - | - | - | ✅ |
| **Conversations** | GET /conversations | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| | POST /conversations | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| **Templates** | GET /message-templates | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| | POST /message-templates | ✅ | ✅ | ✅ | - | - | - | - |
| **Nurture** | GET /nurture-sequences | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /nurture-sequences | ✅ | ✅ | ✅ | - | - | - | - |
| **Scoring** | GET /scoring-rules | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /scoring-rules | ✅ | ✅ | ✅ | - | - | - | - |
| | DELETE /scoring-rules/:id | ✅ | ✅ | - | - | - | - | - |
| **Routing** | GET /routing-rules | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /routing-rules | ✅ | ✅ | ✅ | - | - | - | - |
| | DELETE /routing-rules/:id | ✅ | ✅ | - | - | - | - | - |
| **Tasks** | GET /tasks | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| | POST /tasks | ✅ | ✅ | ✅ | ✅ | - | - | - |
| | PATCH /tasks/:id | ✅ | ✅ | ✅ | ✅ | - | - | - |
| **Conversions** | GET /conversions | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /conversions | ✅ | ✅ | ✅ | - | - | - | - |
| **Integrations** | GET /integrations | ✅ | ✅ | - | - | - | - | - |
| | POST /integrations | ✅ | ✅ | - | - | - | - | - |
| | PATCH /integrations/:id | ✅ | ✅ | - | - | - | - | - |
| | DELETE /integrations/:id | ✅ | ✅ | - | - | - | - | - |
| **CRM Mappings** | GET /crm-mappings | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /crm-mappings | ✅ | ✅ | ✅ | - | - | - | - |
| **Booking** | GET /booking-settings | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| | POST /booking-settings | ✅ | ✅ | ✅ | - | - | - | - |
| **Analytics** | GET /analytics/* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| **Audit Logs** | GET /audit-logs | ✅ | ✅ | ✅ | - | - | - | - |
| **Custom Fields** | GET /custom-fields/defs | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| | POST /custom-fields/defs | ✅ | ✅ | ✅ | - | - | - | - |
| | DELETE /custom-fields/defs/:id | ✅ | ✅ | - | - | - | - | - |
| **Advanced** | GET /pipeline-stages | ✅ | ✅ | ✅ | - | - | ✅ | - |
| | POST /pipeline-stages | ✅ | ✅ | ✅ | - | - | - | - |
| | DELETE /pipeline-stages/:id | ✅ | ✅ | - | - | - | - | - |
| | POST /contacts/merge | ✅ | ✅ | ✅ | - | - | - | - |
| | POST /data/purge-spam-cold | ✅ | - | - | - | - | - | - |
| | GET /failure-inbox | ✅ | ✅ | - | - | - | - | - |
| | POST /sla-rules/evaluate | ✅ | ✅ | - | - | - | - | - |
| **Webhooks** | ALL /webhooks/* | - | - | - | - | - | - | ✅ (API key) |
| **Health** | GET /health | - | - | - | - | - | - | ✅ |

## Summary by Role

**OWNER**: Full access. User deletion, data purge, integration management, audit logs.

**ADMIN**: Full access except: user deletion, data purge. Cannot access OWNER-only advanced features.

**MANAGER**: CRUD on business entities (leads, contacts, campaigns, templates, etc.). Cannot manage users, integrations, or delete configurations.

**SALES_AGENT**: Create/review leads and contacts. Create tasks. Send messages. View templates, analytics, own saved filters. Cannot edit configurations or access audit logs.

**SUPPORT_AGENT**: Read leads, contacts, tasks. Read conversations. View analytics. Read notes.

**VIEWER**: Read-only access to leads, contacts, campaigns, analytics, templates, scoring, routing, QR codes, CRM mappings, booking settings, pipeline stages.
