# Clockwrk Handoff Context

Paste this into a new Claude Cowork chat to bring the assistant up to speed instantly.

---

## Who I am
Mustafa (owner of Clockwrk agency). Personal email `mustayy8@gmail.com`. Dashboard login `mkk@clockwrk.io` / `12345678`.

## Stack
- **Dashboard** (React 18 + Vite 5): `/Users/mustafakhetran/clockwrk-dashboard` · lives at dashboard.clockwrk.io via Cloudflare Pages (`wrangler`).
- **API** (Express, ES modules, Docker container `clockwrk-api` port 3001): `/Users/mustafakhetran/clockwrk-api` · reached via api.clockwrk.io (Cloudflare Tunnel).
- **DB** (MySQL 8, Docker `mysql`): `agency_db`, user `agency_user` / pw `Clockwrk@User123!`.
- **n8n** (self-hosted): API key in `/Users/mustafakhetran/clockwrk-api/.env` as `N8N_API_KEY`. n8n URL `http://localhost:5678`. Public webhook base same-domain via CF Tunnel.
- **Client portal**: my.clockwrk.io (separate app `clockwrk-portal`, not touched today).
- **Marketing site**: `/Users/mustafakhetran/Clockwrk` (static HTML).

## Workflow rules
- **Claude plans + does backend + writes Codex prompts. Codex writes frontend.** Prompts land in `/Users/mustafakhetran/clockwrk-dashboard/.prompts/*.md`.
- The design system reference is at `/Users/mustafakhetran/clockwrk-dashboard/DESIGN-SYSTEM.md` — always read first.
- Codex chat lives inside VS Code (tier "click" — Claude can click into the input and put text on clipboard, user presses ⌘V + Enter).

## Design system (light theme only)
- Page bg `#f0f2f5`, card bg `#ffffff`, ink `#172033`, muted `#7b8495`, line `#e4e8ee`, soft `#f6f7f9`.
- Cards: `border: 1px solid #ececef; border-radius: 16px; box-shadow: 0 8px 26px rgba(31,42,61,0.055);` — hover lifts 2px.
- Pills: 9.5px UPPERCASE 0.05em. Solid backgrounds (no rgba anywhere except shadows).
- Reference pages: `src/pages/Overview.jsx` + `src/pages/Clients.jsx`. Every new page copies their structure (header, KPI strip, two-col grid, side cards, drawer).
- Redesign prompts already written for Projects, Files, Requests, Time: `.prompts/*-redesign.md`.

## Persistent design rule
**Never use semi-transparent colors (`rgba`, `color/X%`, `color-mix()`) on surfaces, borders, or fills. Solid hex only. Shadows can keep alpha.**

## Overview page cards (already shipped)
1. **MoneyCard** — dual-line SVG chart (revenue + expenses), predictions toggle, target line, hover legend, top-source stat, sparklines, net profit / margin. Fetches `/api/stats`, `/api/stats/chart`, `/api/stats/top-source`, `/api/rate/usd-pkr`.
2. **JobsCard** — active/overdue/in-review counts, filter tabs (Overdue/Active/In review), row shows priority dot + status pill + smart date (`Jun 7 · 7d late`).
3. **CashCard / PipelineCard** — compact, wired to `stats.pkr_balance` / `stats.pipeline_value`.
4. **MeetingSchedulerCard** — day/week/month view of `/api/calendar` bookings. Shows client_attendees + team attendees pill pairs. Hover tooltip lists names + roles.
5. **TeamGridCard** — avatar grid, online dot (green pulse) if `is_online`. Backend sorts online-first.
6. **KpiStrip** — small metric cards (used across Clients too).

## Clients page (already shipped)
Full redesign matching Overview language: KPI strip (Active/MRR/At Risk/New This Month), two-col grid, Cards/List view toggle, Top Client hero (lime `#8ee61f`), At Risk hero (dark `#080b0f`), Plan Mix bars, drawer with Overview/Projects/Files/Communications/Billing tabs.

## Backend endpoints (highlights)
- `/api/auth/login` — POST `{email, password}`, returns 7-day JWT.
- `/api/stats` — dashboard metrics + derived (`pkr_balance`, `pipeline_value`, `next_payroll_amount`, `pending_approvals`, `outstanding_invoices_total`).
- `/api/stats/chart?year&month` — daily revenue + expenses for MoneyCard.
- `/api/stats/top-source` — top client for the period.
- `/api/team` — employees with `is_online`, `last_seen_at`, sorted online-first (30s throttled `last_seen_at` stamp on every authenticated request via middleware).
- `/api/clients` — includes `pm_name`, `am_name`, `last_payment_amount`, `total_revenue`, `last_payment_at`, `revenue_30d`, `billing_amount`, `active_projects`, `active_requests`.
- `/api/projects` — includes `pm_name` (falls back to client's PM lead), `am_name`, `active_requests`, `total_logs`. Team members NOT yet in response (present in DB via `assignments` table, entity_type='project').
- `/api/bookings` + auto-assign: n8n `Site Booking` workflow's `Get Assignee` node routes each new booking (existing client → their PM lead, otherwise → AM with lowest load counting active clients + upcoming bookings). API also has a 60s poller sweep + manual endpoints `POST /api/bookings/:id/auto-assign`, `.../sweep`, `.../rebalance`.
- `/api/calendar` — bookings ONLY (no request_due / project_due / payment_due). Each event returns `attendees` (team array with `is_lead`, `role_in_meeting`) and `client_attendees` (with `role`, `is_primary`).

## DB additions this session
- `employees.last_seen_at TIMESTAMP` (+ index).
- `bookings.is_internal TINYINT`, `bookings.client_role VARCHAR(50)`.
- `bookings.guests` now stores JSON objects `[{email, name, role}]` (backwards-compatible with old string arrays).
- `booking_attendees` table (`booking_id`, `employee_id`, `role_in_meeting`) — supports multiple team members per booking.
- `assignments` table now has `subtype='lead'` rows for both PM and AM per client (11 clients seeded).

## Data state right now
- 11 clients, 13 projects (11 active, 2 paused).
- 5 internal team meetings + 12 client meetings + 5 discovery calls seeded in `bookings`.
- Projects renamed to work-focused labels (e.g. "Full Brand Overhaul", "Health Platform MVP"). Company name stays on the frontend via `client_company` join, not in project name.
- Sophie Renaud (duplicate Lagom Studio) deleted.

## Standing TODO list (in `TaskCreate` history)
1. Add timezones to public booking form (detect visitor TZ, pass through to n8n, round-trip through email + Zoom invite).
2. Fix Clockwrk marketing site responsiveness (audit + fix across mobile/tablet/desktop, document breakpoints).

## Deferred items from earlier sessions
- Oracle Free Tier ARM VPS provisioned but not migrated yet.
- Drop `requests.delivery_files` column (unused).
- `job_listings.is_active` vs `status` — redundant.
- Add outcome classifier to past meetings (cancelled / no-show / converted / lost / done). Vocabulary agreed but not shipped.
- Add multiple team members to Projects response (schema is there; just needs SQL + dedup).
- Client portal UI redesign.

## Quick commands
```bash
# Rebuild API container
docker rm -f clockwrk-api && \
  docker build -t clockwrk-api /Users/mustafakhetran/clockwrk-api && \
  docker run -d --name clockwrk-api --link mysql:mysql -p 3001:3001 \
  --env-file /Users/mustafakhetran/clockwrk-api/.env clockwrk-api

# Get an auth token for API testing
TOK=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"mkk@clockwrk.io","password":"12345678"}' \
  https://api.clockwrk.io/api/auth/login | jq -r .token)

# Deploy dashboard to Cloudflare Pages
cd /Users/mustafakhetran/clockwrk-dashboard && \
  npm run build && \
  npx wrangler pages deploy dist --project-name clockwrk-dashboard

# Query DB
docker exec mysql mysql -uagency_user -pClockwrk@User123! agency_db -e "..."

# Update n8n workflow via API
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  http://localhost:5678/api/v1/workflows/{workflow_id}
```

## Files worth pinning
- `DESIGN-SYSTEM.md` — the visual truth.
- `.prompts/*-redesign.md` — ready-to-hand-off Codex prompts.
- `src/pages/Clients.jsx` + `.css` — reference implementation.
- `src/pages/Overview.jsx` + `.css` — the "big picture" page.
- `HANDOFF-CONTEXT.md` — this file.
