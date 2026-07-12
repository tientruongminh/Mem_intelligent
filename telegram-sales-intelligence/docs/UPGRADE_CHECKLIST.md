# Upgrade Checklist

- [x] Manage Customer has an add-customer action from Telegram private chats and automatically syncs messages.
- [x] Transactions support consulting, won, lost, and stopped states.
- [x] New conversations link to previous conversations; the previous summary is loaded into AI context.
- [x] Workflow diagrams have directed nodes/edges, arrows, draggable saved positions, and horizontal/vertical layouts.
- [x] Nodes and edges can open message references; users can edit nodes/edges and lock nodes.
- [x] Message events are debounced for 5 minutes, and a 5-minute scanner backfills unanalyzed conversations.
- [x] Customer Detail includes 9 groups: identity, business context, needs, solutions, budget, barriers, communication, closing likelihood, and decision process.
- [x] Insight Collection explains the discovery process in plain language; technical flow only opens when requested.
- [x] Seed data has 98 insights for anomaly detection, clustering, classification, and association-rule mining.
- [x] Insight, employee profile, and daily report jobs run at 00:00 in the organization timezone.
- [x] Employee Profile has KPIs, overall experience, and detailed workflow playbooks by customer segment.
- [x] Business Report generates HTML and LaTeX from the same data snapshot and stores files in MinIO.
- [x] The real AI provider uses `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`; the fake provider is for demo only.
- [x] GramJS uses real Telegram OTP/2FA when `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` are configured.
- [x] Telegram `StringSession` is encrypted with AES-256-GCM and reconnects automatically after collector restarts.
- [x] OpenClaw/MCP has tools for customer, workflow, experience, insight, metric, and report reads.
- [x] AI has no tool to send messages as a sales rep and no permission to close or mark deals as won.
- [x] Appointments are detected as metadata; Google Calendar only creates drafts after sales confirmation.

## Verified Seed Runtime

| Data                  | Count |
| --------------------- | ----: |
| Customer              |   252 |
| Rich customer profile |   250 |
| Transaction           |   252 |
| Message               | 2,014 |
| Insight               |    98 |
| Insight reference     |   286 |
| Employee              |    16 |
| Employee experience   |    75 |

Demo accounts: `admin@demo.local / Demo123!` and `sale@demo.local / Demo123!`.
