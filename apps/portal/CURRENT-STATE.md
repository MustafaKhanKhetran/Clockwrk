# clockwrk-portal — current state (2026-08-05)

## File tree — the dead tree is GONE (deleted 2026-08-05)

`src/` now contains **only live code**. Anything you can see is in the build:

```
src/
  main.jsx        → imports ./v3/styles.css
  App.jsx         → routes, all from ./v3/pages/*
  mocks.js        → pricing + seed data (shared)
  store.js        → reactive store (shared)
  v3/
    Shell.jsx, Icon.jsx, Primitives.jsx, styles.css
    InstallPrompt.jsx, platform.js
    pages/*.jsx
```

The old v1/v2 trees (`src/pages/`, `src/components/`, `src/context/`, `src/utils/`,
`src/assets/`, `src/index.css`, `src/portal-v2.css`, `src/App.css`, `src-backup-2026-07-03/`)
were ~340 KB of dead code that had silently absorbed a lot of work. All deleted via `git rm`,
so they are recoverable from history if something turns out to have been needed.

Two files were rescued out of the dead tree before deletion and now live in `v3/`:
`InstallPrompt.jsx` and `platform.js` (its Icon usage was rewritten for the v3 `<Icon name>` API).

Also: the service worker aggressively caches. When verifying UI changes, unregister the SW and
clear caches first, or you will be looking at a stale build:
```js
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
caches.keys().then(k => k.forEach(c => caches.delete(c)));
```

## What IS correct

`mocks.js` and `store.js` are shared, so all pricing/business logic is live:

- **Subscription** — Startup $870/wk · $3,350/mo · 1 slot; Business $1,550/wk · $6,000/mo · 2 slots;
  Enterprise $2,300/wk · $8,950/mo · 3 slots. Monthly ≈ true 10% off (weekly × 52/12 × 0.9).
- **Retainer** (post-launch product) — `CARE_PLANS`: Care $295/mo ($2,950/yr, 2 hrs, 2 business days),
  Care+ $495/mo ($4,950/yr, 5 hrs, next business day, `recommended`), Care Pro $895/mo ($8,950/yr,
  12 hrs, 4 business hours). `RETAINER_EXTRA_HOURS` = $85/hr or 5 hrs for $375.
- **`PLAN_CARE`** maps plan → included retainer tier (Startup→starter, Business→growth, Enterprise→business).
  Retainer care is **included free** while on a subscription; it becomes the standalone bill after the build ships.
- **Store** — `accountMode` ('subscription'|'retainer'), `retainerTier`, `switchToRetainer()`,
  `resumeSubscription()`, `hoursUsed`, `logHours()`, `buyHourBlock()`.
- **Service catalog** — 52 items tagged `billing: 'included' | 'care' | 'infra'` (30/11/8).
  `included` items are free requests, never purchasable. `REQUESTABLE_SERVICES` groups them for New Request.

v3 already references `CARE_PLANS`, `PLAN_CARE`, `accountMode`, `switchToRetainer`, and its Billing
page correctly renders "Care+ protects what ships · $495 value/month · 5 hours of edits".

## Known bugs (all in the LIVE v3 tree)

1. ~~**Monthly price doesn't change.**~~ **Not a real bug — retracted 2026-08-05.** Verified live:
   "Pay monthly" correctly shows `$6,000/month`. The earlier observation came from the dead tree
   and/or `AnimatedNumber` freezing when `requestAnimationFrame` is throttled in a background tab.
   Still worth adding: the saving vs weekly (`price * 52/12 - monthlyPrice` = $717/mo for Business).
2. **`annualPrice` and `RETAINER_EXTRA_HOURS` unused in v3** — no annual retainer pricing, no
   "$85/hr or 5 hours for $375" overage line.
3. ~~**PWA install prompt never renders.**~~ **Fixed 2026-08-05.** Mounted in `src/v3/Shell.jsx`
   and the CSS ported into `v3/styles.css`. All surfaces now sit in a single fixed
   `.install-layer` flex column, so the update toast and an install panel can never overlap;
   the layer clears `.v3-mobile-nav` on phones and actions are 44px there. Verified end to end:
   suppressed on visit 1, shown on visit 2, Install calls `prompt()`, "Not now" sets the 14-day
   flag, light + dark, 375px and 1280px, no horizontal overflow.

Note: v3 scans **clean** at 375px — zero overflowing elements. The overflow bugs chased earlier
existed only in the dead stylesheet.

## PWA status

Working: manifest (`Clockwrk Client Portal`, standalone, start `/home`), service worker + Workbox
precache, CW-branded icons (192/512/maskable/apple-touch), iOS meta tags, `viewport-fit=cover`,
and the install prompt (mounted 2026-08-05).

## Auth — REAL as of 2026-08-05

`Login.jsx` calls `POST /api/client/login` (bcrypt + JWT, 7-day expiry). The token and client
live in `localStorage` under `clockwrk_portal_token` / `clockwrk_portal_client`, wrapped by
`src/v3/session.js` (a `useSyncExternalStore` store) so the route guard re-renders on sign-in,
sign-out, and on any 401 clearing the token from inside `api.js`.

- `src/v3/api.js` — the only place that talks to the API. Handles the token, JSON, and a
  friendly message for network failures. A 401 clears the session and bounces to /login.
- Sign-out (Settings → Security) clears the session *and* calls `store.resetToSeed()` so the
  next client never sees the previous one's data.
- Test account: **moaz@lagom.studio / clockwrk2026** (client id 1, Lagom Studio, Enterprise,
  3 projects, 5 requests). Set via bcrypt hash directly in `clients.password_hash`.

Still to do: password reset, and a signup/invite path. Clients must be given a password by you.

## Environment

- API base URL comes from `VITE_API_URL` (`.env.local` → `http://localhost:3001`).
  **Production must set `VITE_API_URL=https://api.clockwrk.io`.**
- Preview (needed for service workers): `npm run build && npm run preview -- --port 4173`
- Public HTTPS for phone testing: **https://portal-dev.clockwrk.io**
  → tunnel `clockwrk-portal-dev`, config `~/.cloudflared/portal-dev.yml`, origin `localhost:4173`.
  Separate from the `clockwrk-n8n` tunnel (n8n + api) — restarting one never affects the other.
- Live site `my.clockwrk.io` is on Cloudflare Pages, serving an **old build**.
- **Deploy is blocked**: wrangler is logged in as `pakcarriageco.pk@gmail.com`, not the Clockwrk
  account. Needs `npx wrangler login`.
- `vite.config.js` has `allowedHosts: true` so tunnelled hosts work.
- TryCloudflare quick tunnels (`--url`) return 404 in this environment — use the named tunnel.

## Phase 1 — done 2026-08-05 (see AUDIT.md for the full plan)

The portal now reads and writes the real database. What is live:

| Area | State |
|---|---|
| Auth | Real. bcrypt + JWT, route guard, sign-out, 401 handling. |
| Requests | Real. `GET/POST /api/client/requests` (added). Creating one **writes to MySQL**. |
| Projects | Real, from `/api/client/projects`. |
| Messages | Real, per-project threads, 10s poll, optimistic send. |
| Tickets | Real. Creating one raises a `dashboard_alerts` row for the team. |
| Invoices | Real, from `payments`. |
| Billing dates | Real `next_payment_due` + monthly saving cue. |
| Profile save | Real, `PATCH /api/client/me`. |
| Downloads | Real `file_url` links (disabled when a file has no URL). |

`store.loadFromApi()` runs once on Shell mount and replaces requests/projects/invoices/account.
`dataSource` is `'mock'` until it resolves, then `'server'`.

**API changes** (in `clockwrk-api`, image rebuilt):
- Split the rate limiter — `loginLimiter` was on the whole `/api/client` router, so any client
  was locked out after 10 total calls. Credentials keep 10/15min; the rest is 120/min.
- Added `GET/POST /api/client/requests`, with an ownership check on `project_id`.
- Added `project_id` to `client_messages` (nullable, additive) + ownership check.
- `dashboard_alerts.type` gained `'support'` and `'message'` — `'support'` was **not a valid
  enum value**, so every client ticket 500'd after saving and never notified the team.
- Alert inserts are now non-fatal.
- Dates are formatted at the API boundary (no raw ISO in the UI).

## Still to do (Phase 2/3 in AUDIT.md)

1. Payment flow — nothing can mark a payment received from the client side.
2. Plan change confirmation + proration; retainer round-trip (`resumeSubscription` unreachable).
3. Approve / request-revision still mutate local store only — they do not write back.
4. Projects, Deliverables filters, and Site tabs still read seed data in places.
5. Onboarding / empty states for a brand-new client.
6. Password reset + invite flow.

---

## Dashboard (clockwrk-dashboard) — live 2026-08-05

Runs on **http://localhost:5182** (`.claude/launch.json` → `dashboard`). Login
**mkk@clockwrk.io / 12345678**. It was already wired to the API (`VITE_API_URL || localhost:3001`),
so it needed connecting up rather than rebuilding. All 22 routes render without errors.

Changes made to bring it up:
- Added `http://localhost:5182` to `ALLOWED_ORIGINS` — every request was being CORS-blocked.
- `src/pages/Alerts.jsx` — added the `support` and `message` alert types (icon, colour, filter)
  so client tickets and messages coming from the portal are visible and filterable.
- API `GET /api/alerts` now returns `unread_count`. The dashboard header reads `data.unread_count`,
  which the API never sent, so it showed **"0 unread" permanently** despite 9 unread rows.
- Fixed 9 rows of double-encoded em-dashes in `dashboard_alerts` and `requests`
  (`â€"` → `—`, byte pattern `C3A2E282AC`). Legacy seed data; new writes round-trip UTF-8 correctly.

### ⚠️ The messaging loop is only half-built

A client can now open a ticket or send a message from the portal, and an alert appears on the
team dashboard. **But the dashboard has no inbox** — there is no `/support` or `/messages` route,
and nothing in `src/` reads `client_tickets` or `client_messages`. So you can see that a client
wrote, but you cannot read the thread or reply.

Alert links now point at `/clients` (they pointed at non-existent routes and redirected to `/`).

**Top of the Phase 2 list:** a dashboard Messages/Tickets inbox plus the team-side write
endpoints (`sender = 'team'` on `client_messages`, and `client_ticket_replies`).

### ⚠️ API image drift

Docker Desktop's DNS could not resolve `registry-1.docker.io` at the time, so the final image
rebuild failed. The running container was patched with `docker cp` + restart, which survives
`docker restart` but **not** `docker rm`/`run`. Only one cosmetic change is affected (alert
`link` → `/clients`); everything else is baked into the image. **Rebuild when the registry is
reachable:**
```bash
cd ~/clockwrk-api && docker build -t clockwrk-api . && docker rm -f clockwrk-api && \
  docker run -d --name clockwrk-api --restart unless-stopped -p 3001:3001 \
  --link mysql:mysql --env-file .env clockwrk-api
```

### Note for committing

`clockwrk-dashboard` is **not a git repository** — `git init` is needed before its changes
(`src/pages/Alerts.jsx`, `.claude/launch.json`) can be committed. `clockwrk-portal` and
`clockwrk-api` are both repos with uncommitted work.

### Workflow Health page reads falsely

It reports "All 5 workflows offline — check the Express API server". Measured directly, every
endpoint answers in 3–25ms. The page fires all 19 checks in parallel and starves itself on the
browser's 6-connection-per-host limit. Batch the checks; it is not a real outage.

---

## Mock data purge — 2026-08-08

### Database
Full backup first: `~/clockwrk-backups/agency_db_20260808_023303.sql` (264K, restores everything).

**Deleted:** all 13 clients, 13 projects, 23 requests, 36 request comments, 16 files,
20 payments, 468 payment predictions, 126 prediction runs, 20 bookings + 41 attendees,
112 assignments, 40 time logs, 41 expenses, 11 dashboard alerts, 15 newsletter subscribers,
12 audit logs, and all non-owner job/internship applications.

**Kept on purpose:** 19 employees (owner `mkk@clockwrk.io` + 18 placeholders), 2 teams,
22 job listings, 3 referrers + 3 referrals, and the owner's own job/internship application.

**Demo client for portal access:** `demo@clockwrk.io` / `clockwrk2026`
(client id 14, Demo Company, Business plan, monthly, 1 project "Website Build", id 16).

### Frontend
`src/mocks.js` → **`src/catalog.js`**, cut from 33 KB to 12 KB. It now holds only real
configuration — `PLANS`, `CARE_PLANS`, `PLAN_CARE`, `ADDONS`, `RETAINER_EXTRA_HOURS`,
`SERVICES`, `SERVICE_CATALOG`, `REQUESTABLE_SERVICES`, `LAUNCH_BUNDLES`.

Removed entirely: `me`, `people`, `team`, `projects`, `requestsSeed`, `invoices`, `messages`,
`tickets`, `activity`, `domainsSeed`, `mailboxesSeed`, `hostingSeed`, `securitySeed`, `reportsSeed`.

The store no longer seeds anything — `dataSource` starts `'empty'` and only `loadFromApi()`
fills it, so a fabricated project or request cannot reach a client's screen.

Fixed leaks that only became visible against an empty database:
- Home greeted "Sardar" (mock user) and showed a hardcoded "Tuesday · 4 August" — both now real.
- Home's "slot available" was hardcoded to 2 instead of the plan's slots.
- "Portfolio" counted mock projects.
- Settings listed four invented teammates.
- Mock team avatars and the "Recent signals" activity feed are gone.

### Removed: My site
`src/v3/pages/Site.jsx` deleted, route and nav entry removed, `/site` redirects to `/home`.
Its Hosting/Domains/Email/Security/Reports tabs were 100% invented — including a fixed
"99.99% uptime · 4h since last backup · 0 security alerts" for infrastructure nobody monitors.

### New: error boundary
`src/v3/ErrorBoundary.jsx`, wrapped around the routed content in `Shell.jsx`.
A crash in one page used to unmount the whole tree and leave a blank white screen with no nav —
which is exactly what happened when Projects hit the real API shape. Now the shell survives.

### API
`GET /api/client/projects` returns the shape the portal renders (`tagline`, `progress`, `stack`,
`preview`, `pm`/`am`/`members`, dates) instead of raw columns, so pages don't have to guess.
Project pages were also made defensive about missing fields.

**Note:** the API image still needs a rebuild when Docker's registry DNS recovers — the running
container is patched via `docker cp`, which does not survive `docker rm`.

---

## Fully wired to the backend — 2026-08-08

`registerType` is now **`autoUpdate`**. With `'prompt'`, a client who ignored the update toast
kept running stale code against a changing API; now the new service worker claims control and
they pick up the latest build on their next navigation.

### Every mutation the UI can reach now writes to MySQL

| Action | Endpoint |
|---|---|
| Sign in / out | `POST /login`, local session clear |
| Create request | `POST /requests` |
| **Approve delivery** | `POST /requests/:id/approve` |
| **Request changes** | `POST /requests/:id/revision` |
| **Comment on a request** | `POST /requests/:id/comments` |
| **Create project** | `POST /projects` |
| Message the team | `POST /messages` |
| Open a ticket | `POST /tickets` |
| Save profile | `PATCH /me` |
| **Change password** | `POST /change-password` |

The only UI action that stays local is `setBillingCadence`, which is a **price preview** (weekly
vs monthly), not a billing change — the buttons now read "Weekly / Monthly" rather than "Pay …".

### Approve frees a slot, server-side

`promoteNextQueued()` reads the client's plan (`startup` 1 / `business` 2 / `enterprise` 3),
counts what is in production, and pulls the oldest queued request into `in_progress` if there is
room. Verified end to end: approving in the UI completed the request **and** promoted the queued
one, and the live rail went to "2 of 2 slots used".

### Billing controls raise real requests instead of faking success

Plan change, Add capacity, Pause, Move to care and Cancel used to mutate local state and lie.
There is no self-serve payment flow, so each now opens a **Billing Question ticket** the team
receives, and shows "… sent. The team will confirm shortly." Verified: clicking Add capacity
created ticket "Extra request slot".

### Schema changes
- `request_comments.employee_id` made nullable + `client_id` added, so a client can author a
  comment (previously impossible — the column was `NOT NULL`).

### Removed
- Queue drag-to-reorder. It only reordered local state, and passed the index *within the filtered
  column* to a store method expecting a global index, so filtering by project reordered the wrong
  request. The queue now says "Starts automatically when a slot frees", which is what actually
  happens.

### Every client action alerts the team
`dashboard_alerts` rows are raised for: new ticket, new message, new request comment, changes
requested, delivery approved, and new project.

### Still not wired (deliberate — needs a payment flow and product decisions)
`rate`, `logHours`, `buyHourBlock`, `resetHours`, `orderService`, `requestService`,
`toggleService`, `buyBundle`, `toggleAddon`, `registerDomain`, `setPaymentStatus`,
`resumeSubscription`. None are reachable from the UI, so nothing fake is on screen.

---

## Projects overhaul + Settings — 2026-08-08

### Schema
- `projects` gained `type`, `icon_emoji`, `logo_url`, `goal`, `audience`, `success_measure`.
- New `project_links` (kind: production/staging/figma/prototype/github/appstore/docs/other).
- New `project_resources` — client **inputs** (brand kit, requirements, competitor refs, Drive
  folders). Deliberately separate from `files`, which are Clockwrk **outputs**.
- New `client_contacts` + `clients.notify_prefs` for the Settings work.

### New API
`GET/PATCH /projects/:id`, `POST/DELETE /projects/:id/links`,
`POST/DELETE /projects/:id/resources`, `POST /uploads` (R2, 25 MB cap, reuses the
`routes/files.js` S3 config), `PUT /notifications`, `GET/POST/PATCH/DELETE /contacts`.

Project detail also returns a **work summary** (in progress / needs review / up next / delivered)
and a **derived activity feed** — a UNION over requests, comments, files and messages rather than
a separate events table that could drift or be faked.

### Project composer
- **14 types** (was 5), each with an icon and a one-line description, in a card grid.
- **Icon picker** with an Auto option. If nothing is chosen the server assigns a deterministic
  emoji from the type — `TYPE_EMOJI` in `clientPortal.js` mirrors `projectTypes.js`, **keep the
  two in sync when adding a type**.
- **Budget context removed.**
- Goal, Audience, Success measure and Target date are now bound and saved (they were unbound
  inputs whose values were discarded).
- Links and resources can be added during setup, and **documents upload to R2**.

### Project detail (refined, not rebuilt)
Header (icon, status, type, target date, objective) + New request / Message Clockwrk / Open
project · work summary counts **replacing the completion percentage** (projects can stay open
indefinitely, so a percentage was meaningless) · Current work with recently delivered ·
Project links · Project resources · Recent deliverables preview with View all · editable
Project brief · Recent activity.

### Settings
Brand kit **removed** — it now lives per project under Resources (`kind: 'brand'`).
Notification toggles and teammate contacts are real and persist; both were local-only before.

### UI
Rounded throughout — no sharp corners on inputs, buttons, cards, file marks or the login form.
Fixed three inherited-CSS collisions: `.v3-record-actions > button` was clobbering the `Action`
component's layout, the old `aside > section:first-child button` crew rule was stretching the
brief's Edit button, and the project header's fourth column squeezed long titles onto three lines.

---

## Tickets, calls, icons, project context — 2026-08-08

### Ticket detail (`/support/:ticketId`)
Full thread — the original description plus every reply — with a reply box, 15s polling, and a
"replying will reopen it" note on resolved tickets. Ticket rows on `/support` are now clickable.
`POST /tickets/:id/reply` also raises a `dashboard_alerts` row; it was previously silent, so a
client reply reached nobody.

### Book a call — real availability
`GET /bookings/availability` generates weekday slots from `CALL_HOURS` and **filters out times
already taken in the `bookings` table**. Nothing offered is invented. `POST /bookings` re-checks
for a clash and returns 409 if the slot went while the dialog was open, then refreshes what is
still free. Booking writes a real `bookings` row and alerts the team. Verified: booking 14:00
removed 14:00 from the next availability response.

Shared component `src/v3/BookCall.jsx`, used by Messages (attached to the open project) and by
Help → "Book working time".

### Project icons everywhere
`ProjectCode` now renders logo → emoji → initials, so the project icon appears on Projects,
Requests, Home, Messages, Deliverables and the composer. Emoji come from the client's choice or
the API's type-based fallback.

### Project context carries through
Navigating from a project passes `?project=<id>`, and the destination applies it:
Requests and Deliverables pre-select the filter (via `useSearchParams`, so it survives reload and
is shareable), New Request preselects the project, and Messages opens that thread.

### Spacing / type pass
Project panels were inheriting header rules written for a different layout — the "View all"
control rendered as a full-width 60px block and "Recent deliverables" wrapped onto two lines.
All four panels (Current work, Links, Resources, Deliverables) now share one system: 22px
padding, 20px radius, a flex header with a 34px pill action, and empty states inside a dashed
box rather than floating in dead space.

Also fixed: the legacy `.v3-call-dialog > div` grid outranked `.v3-day-strip` on specificity and
forced the date picker into two columns.

### Note on "live workspace"
The old **Live workspace** section (a fake site preview) was already removed when Project Links
replaced it. If the intent was to remove **Project Links** too, that is still there — it holds
the production/staging/Figma/GitHub links and drives the header's "Open project" button.

---

## Billing: pending-activation model — 2026-08-08

**Nothing a client buys activates until the money has arrived and the team has
verified it.** Capacity never moves on a promise.

```
requested → awaiting_payment → payment_reported → (team verifies) → active
                     ↓ 7 days, never reported
                  expired
```

### The client picks how to pay
`GET /billing/quote` prices every option so the portal shows them side by side.
Business → Enterprise, monthly, 18 days left:

| Mode | Pay now | Activates | Next billing date |
|---|---|---|---|
| `prorate_now` | $1,770 | On verification | **Unchanged** — then $8,950 |
| `at_renewal` | $0 | At renewal | Unchanged — then $8,950 |
| `fresh_cycle` | $5,350 | On verification | **Moves** to today + 1 cycle |

`fresh_cycle` **credits the unused portion** of what they already paid
($8,950 − $3,600). Charging full price while they still hold paid-for days is the
classic "why was I charged twice" dispute — the credit costs nothing and removes it.

Add-ons deliberately offer only `prorate_now` and `at_renewal`; resetting the whole
subscription cycle to add a slot would move the billing date for an unrelated reason.

### Rules
- **Downgrades / add-on removals** — scheduled for period end, no payment step, no refund.
  The quote returns `currentSlots` vs `newSlots` so the UI can warn which work gets pushed back.
- **Cadence switch** — at next renewal, no proration.
- **Expiry: 7 days, paused on report.** `expires_at` is set to NULL the moment a client taps
  "I've sent it", so only people who never started can be auto-cancelled — an international USD
  transfer in flight will never be cancelled underneath them.
- **One open change at a time** (409 otherwise) so bank reconciliation stays sane.
- **Partial payment** records `amount_received`, sets `partially_paid`, and does **not** activate.
- **Payment reference** per change (`CW-14-A7DK`, no easily-confused characters).

### Where things live
- `services/billingChanges.js` — pricing, quoting, `applyChange`, `slotsFor`, `sweepChanges`.
  `PLANS` and `ADDONS` are duplicated from the portal's `catalog.js`; **keep them in sync.**
- Client endpoints: `/billing/payment-details`, `/billing/summary`, `/billing/quote`,
  `POST /billing/changes`, `/changes/:id/reported`, `/changes/:id/cancel`.
- Team endpoints (finance roles): `GET /finance/subscription-changes`,
  `POST /finance/subscription-changes/:id/verify` (accepts `amount_received`), `.../reject`.
- Verification also writes a `payments` row so the transfer shows in invoice history.

### Bank details
Stored in a new **`app_settings`** table, not `.env` — values contain spaces, which breaks
shell sourcing of `.env`, and Docker's `--env-file` treats quotes literally so quoting is not an
option either. The table also means details can be edited later without a redeploy.
Served **only** from `GET /billing/payment-details` behind client auth (verified: 401 without a
token) and never bundled into the frontend.

### Billing UI — built 2026-08-08
- `src/v3/PlanChangeDialog.jsx` — prices all three options from the API and lets the client
  choose. Downgrades skip the picker and show a slot warning instead.
- `src/v3/PendingChange.jsx` — the waiting room: what is pending, what it costs, copyable bank
  details, the payment reference, and "I've sent the transfer" (which pauses the expiry clock).
- Billing page renders pending changes above the hero and lists active add-ons under capacity.

`slotsFor()` is now wired into `promoteNextQueued()`, so paid-for add-on slots are honoured when
a freed slot pulls the next queued request into production. The duplicate `PLAN_SLOTS` map in
`clientPortal.js` was deleted — `slotsFor()` is the single source.

**Fixed while testing:** the Billing page read plan/cadence from the store, which only loads once
at shell mount, so it showed the old plan and price after a change was verified. It now prefers
the `/billing/summary` response and calls `store.loadFromApi()` when the plan changes, keeping
the live rail and other pages in sync.

**Not a bug:** the hero price can look stale in a non-painting browser pane — `AnimatedNumber`
only updates via `requestAnimationFrame`. It reads correctly ($8,950/month) once painted.

### Still to build
A dashboard screen for verifying transfers. The endpoints exist
(`GET/POST /api/finance/subscription-changes...`) but there is no UI, so verification currently
needs a curl call.
