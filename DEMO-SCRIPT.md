## Live Demo Walkthrough — EventPro Marketing

### 1. Landing Page (30s)
- Navigate to `https://deploysafe.in/`
- Show the headline: "Your leads never wait for a reply ever again"
- Point out the CTA buttons, feature sections, professional design

### 2. Chat Widget (60s)
- Click the chat widget (bottom-right corner)
- Send: *"Hi, we need event planning for 300 guests in Bangalore"*
- Show the AI agent responding in real-time, asking qualifying questions
- Agent collects: event type, guest count, budget, venue preference

### 3. Dashboard — Lead appears in real-time (30s)
- Log in at `https://deploysafe.in/#/login`
  - Email: `udayakirantumma@gmail.com`
  - Password: `8074228036`
- Show the Overview page — new lead visible, conversations count updated

### 4. AI Agent Configuration (30s)
- Navigate to AI Agent page (`/#/ai-agent`)
- Show the Configure tab — EventPro Marketing niche, qualification questions
- Show the Conversations tab — the live chat with the new lead

### 5. Leads & Contacts (30s)
- Navigate to Leads page — table view (desktop) / card view (mobile)
- Click a lead to show source, status, and timeline
- Navigate to Contacts page — show contact history

### 6. Campaigns & QR Codes (20s)
- Campaigns page — existing campaigns, performance metrics
- QR Codes page — per-card Telegram QR code generation

### 7. Automation & n8n (30s)
- Open n8n at `https://deploysafe.in/n8n/` (admin: `udayakirantumma@gmail.com` / `Maheshwari21!`)
- Show the active workflows: Lead Intake, Send Message, Follow-up Runner, Hot Lead Alert
- Explain: n8n handles scheduled nurture, backend handles real-time Telegram/webhooks

### 8. Mobile Responsive (20s)
- Open Chrome DevTools, toggle device toolbar (or show on phone)
- Dashboard adapts: tables become stacked cards, touch-friendly targets

### 9. Telegram Bot (30s)
- Open Telegram, find `@lead_automation_bot`
- Send a message — shows the AI agent responding via Telegram
- Same EventPro Marketing flow, different channel

### Total: ~5 minutes

### Credentials
| Item | Value |
|---|---|
| Dashboard | `udayakirantumma@gmail.com` / `8074228036` |
| n8n | `udayakirantumma@gmail.com` / `Maheshwari21!` |
| Telegram bot | `@lead_automation_bot` |
| Widget embed | `<script src="https://deploysafe.in/widget/embed.js" data-widget-id="default"></script>` |

### Key talking points
- **Zero 500 errors**: 176+ API routes, all returning proper responses
- **559 backend tests** + 14 e2e tests, all passing
- **Rate limited**: Chat 120/min, Webhooks 120/min — protects against abuse
- **Multi-channel**: Captures leads via web widget, Telegram, forms, QR codes, campaigns
- **AI-powered**: DeepSeek-driven agent that qualifies and responds 24/7
- **Telegram-first**: All notifications and follow-ups go through Telegram (no WhatsApp dependencies)
