# Clockwrk Client Portal — launch readiness audit

**Date:** 2026-08-05 · **Scope:** every live file in `src/` (the v3 tree), cross-checked against
`clockwrk-api`. Findings below were verified by reading the code and exercising the running app,
not inferred.

---

## 0. The one-line summary

The portal is a **complete, well-built prototype with almost no logic behind it.** The design
system, layout, animation and responsive work are genuinely good. But it is a closed loop of mock
data: **nothing a client does in it persists, reaches you, or reaches the database.**

The gap is smaller than it looks, because `clockwrk-api` already has a working client portal API
(`/api/client/*`) that the frontend has simply never been connected to. That is the single
highest-leverage thing on this list.

---

## 1. Actions that do nothing at all (highest severity)

These are the ones that will lose you a client, because they *look* like they worked.

### 1.1 Creating a request does not create a request ⛔

`v3/pages/NewRequest.jsx` never imports the store. The four-step composer collects project,
service, title, brief and priority — then `setDone(true)` shows a success screen reading
*"Request added — it is connected to {project} and ready in your production queue."*

Nothing is added. Navigate to `/requests` and it is not there. The brief is discarded.

This is the core action of the entire product.

### 1.2 Creating a project does not create a project ⛔

`v3/pages/NewProject.jsx`, same pattern — a three-section form, a success screen saying
*"Project workspace created"*, and no write. The goal, audience, success measure, target date and
budget fields are not even bound to state; they are unbound `<input>`s whose values are dropped.

### 1.3 Everything else that silently discards input

| Where | What is lost |
|---|---|
| `Settings.jsx` "Save profile" | Sets `saved` true for 1.8s. No write, no persistence. |
| `Settings.jsx` "Update access code" | No `onClick` at all. Dead button. |
| `Settings.jsx` invite / remove member | Local `useState` only, gone on reload. |
| `Settings.jsx` notification toggles | `defaultChecked`, uncontrolled, never read. |
| `Support.jsx` new ticket | Local `useState` only, gone on reload — *and the API has `POST /api/client/tickets`.* |
| `Messages.jsx` send message | Local `useState` only — *and the API has `POST /api/client/messages`.* |

---

## 2. Buttons with no handler (verified: no `onClick`, no `type="submit"`)

| File | Button | Expected |
|---|---|---|
| `Billing.jsx` | Invoice **download** (every row) | Download the PDF |
| `Deliverables.jsx` | File **download** (every row) | Download the file |
| `RequestDetail.jsx` | Deliverable row | Download / preview |
| `ProjectDetail.jsx` | Deliverable row | Download / preview |
| `Site.jsx` | Report card (all 3) | Download the report |
| `Settings.jsx` | Brand logo download, "Add brand assets", 5 colour swatches | Upload/copy |
| `Support.jsx` | "Book working time", "Portal guide" | Booking, docs |
| `Support.jsx` | Every ticket row | Open ticket detail (no detail route exists) |
| `Messages.jsx` | "+" new thread, attach file | Compose, upload |
| `NewRequest.jsx` | "Add files or links" | Attach to brief |

**Download is the theme.** There is no file storage and no download handler anywhere in the live
tree. Every download icon in the portal is decorative. For an agency portal whose entire value is
"your deliverables live here", this is the most visible broken promise after §1.

---

## 3. Visibly broken rendering (confirmed in the running app)

These are field-name mismatches between `mocks.js` and the pages. They render as **blank text**.

| File | Reads | Mock actually has | Result |
|---|---|---|---|
| `Site.jsx` email tab | `box.email` | `address` | **Two completely blank rows** — verified |
| `Site.jsx` reports tab | `report.title` | `type` + `period` | **Blank headings on all 3 cards** — verified |
| `Site.jsx` reports tab | `report.createdAt` | `generatedAt` | All 3 fall back to hardcoded `Jul 1, 2026` |
| `Site.jsx` security tab | `monitor.lastRun` | *(absent)* | All fall back to "Checked today" |
| `Support.jsx` | `ticket.updatedAt` | `at` | Blank timestamp on every ticket |

### Hardcoded values that will be wrong on day one

- `Home.jsx` — the date is the literal string **`Tuesday · 4 August`**. It never changes.
- `Home.jsx` — *"{Math.max(0, 2 - active.length)} slot available"* hardcodes **2** instead of
  `baseSlots + extraSlots`. Wrong for Startup (1) and Enterprise (3), and wrong after buying a slot.
- `Site.jsx` — region hardcoded to **Singapore**, runtime to **Edge + Node**, health card to
  *"99.99% uptime / 4h since last backup / 0 alerts"* regardless of actual state.
- `Messages.jsx` — thread previews and the unread badge `2` are hardcoded to `project.id === 1`.
- `mocks.js` — `me.email` is **mustayy8@gmail.com**, your own address, shown in Settings.

---

## 4. Logic that exists but is unreachable

13 store actions are never called from the live UI. Some are just unfinished; three are business
problems:

| Action | Consequence |
|---|---|
| `resumeSubscription` | **The retainer switch is a one-way door.** Verified: after "Move to ongoing care" there is no path back to a subscription anywhere in the UI. A client who downgrades cannot re-upgrade without emailing you. |
| `setPaymentStatus` | **Nothing can ever mark a payment as paid.** The "Transfer due soon" banner on Home is permanent and undismissable. |
| `markNotificationsRead` | The notification dot never clears. It will be red forever. |
| `logHours`, `buyHourBlock`, `resetHours` | The entire retainer hours economy is unreachable — clients can't see hours tick down or buy more. |
| `rate` | No rating UI exists, so you collect zero delivery feedback. |
| `removeSlot` | Clients can add capacity but never remove it. |
| `orderService`, `requestService`, `toggleService`, `buyBundle`, `toggleAddon`, `registerDomain` | The whole paid-services layer is unreachable. |

### The services catalogue you asked for is built but not wired

You explicitly asked to *"display the services we provide when the user is adding a new request."*
`REQUESTABLE_SERVICES` was built in `mocks.js` for exactly this — it groups the 30 catalogue items
tagged `billing: 'included'`.

**`NewRequest.jsx` does not use it.** It uses the older flat `SERVICES` list instead. So does the
routing helper `consumePendingRequestService`, which is never called — meaning
`routeIncludedServiceToRequest` pushes a client to `/requests/new` with a pre-selected service that
the page then ignores.

`SERVICE_CATALOG` (52 items) and `LAUNCH_BUNDLES` are entirely unused by the live tree.

---

## 5. Business logic that was never decided

This is the part you flagged, and you are right that it is missing. None of these have an answer in
the code today.

### 5.1 Plan upgrade / downgrade

`Billing.jsx` "Change plan" calls `store.setPlan(name, slots)` **immediately on click.** No
confirmation, no summary, no payment step. Click Enterprise and you silently have 3 slots.

Undecided, and needed before launch:

- **When does it take effect** — immediately, or at the next billing date?
- **Proration** — upgrading mid-cycle, do they pay the difference now or a bigger next invoice?
- **Downgrade with work in flight** — `enforceSlotCap` already handles the mechanics correctly
  (it demotes newest-first back to the front of the queue), but the client is never *told*. They
  will see a request silently leave production. This needs a confirmation dialog:
  *"Downgrading to Startup will pause 'Marketing site dark mode' and return it to the queue."*
- **Downgrade timing** — I would strongly recommend downgrades take effect at period end, upgrades
  immediately. That is the industry norm and it protects your revenue.

### 5.2 Payment

There is no payment flow at all. `paymentStatus` starts as `'due'` and nothing can change it.

- No "Pay now" button, no bank details, no payment reference, no receipt.
- No way for *you* to mark a transfer received (that belongs in the dashboard, not here).
- The API has `payments` with a `status` of `pending`/`confirmed`, so the data model exists.

Given you take bank transfers, the minimum viable flow is: show the amount, the account details,
and a reference code; let the client mark "I've sent it"; you confirm from the dashboard; the
banner clears. That is a day of work and it closes the loop.

### 5.3 Retainer transition

The flow exists in one direction only. Undecided:

- What happens to **queued requests** when a client moves to a retainer? They have slots today and
  hours tomorrow — the queue has no meaning in retainer mode, but nothing clears or converts it.
- What happens when **hours run out** mid-month? `RETAINER_EXTRA_HOURS` ($85/hr, or 5 hrs for $375)
  is defined and never surfaced.
- **When do hours reset?** `hoursResetAt` is a hardcoded string `'Aug 18'`.
- Do unused hours **roll over**? (Recommend: no, or cap at one month — rollover is a support burden.)
- Annual retainer pricing (`annualPrice`, ~2 months free) is defined and never offered.

### 5.4 Cancellation

The "Cancel at period end" option in the Subscription options dialog **just closes the dialog.**
No confirmation, no retention offer, no state change, no notification to you.

### 5.5 Onboarding

There is no first-run state. A brand new client logs in to Sardar Khan's populated workspace —
5 requests, 3 projects, invoice history. Every page needs a genuine empty state, and there is no
"welcome / set up your first project" path.

---

## 6. Missing visual cues

You asked specifically about this. The gaps, in rough order of how much they matter:

**Billing page**
- **No next billing date anywhere.** `me.renewsAt` exists in mocks and is never rendered.
  `paymentDueAt` is only used by the Home banner. The billing page — the one place a client looks
  for "when am I next charged" — does not say.
- No amount-due callout, no payment method, no "paid through" line.
- No monthly-vs-weekly saving shown (it's $717/mo on Business — a strong reason to prepay, invisible).
- Invoice rows show no due date and no overdue state.
- No alert/banner on the billing page at all; the payment warning only appears on Home.

**Requests / work**
- No indication of **where you are in the queue** beyond a number, and no ETA.
- No revision-limit cue — `revisionsUsed` is counted and displayed, but there is no *limit*, so the
  client can't tell if they're near one. Decide whether revisions are capped.
- No overdue state on requests. `due` is a string like `"in 2–3 days"`, never compared to today.
- Approving a delivery promotes the next queued item — genuinely nice logic — but the client is
  never told it happened. `state.promoted` is set and never rendered.

**Global**
- No toasts/confirmations for any successful action.
- No loading or error states anywhere (there is no async, so there is nothing to show yet — but
  every one of these appears the moment you connect the API).
- No unread indicator on Messages in the nav.
- No session expiry, no "signed out" state.

---

## 7. Messages: build vs buy

**Recommendation: keep it in-house. Do not add an external service.**

Reasons:

1. **You already have the backend.** `GET /api/client/messages` and `POST /api/client/messages`
   exist in `clockwrk-api`, backed by a `client_messages` table. The frontend just isn't calling
   them. Wiring this is a few hours, not a project.
2. **Context is the whole point.** Your messages are attached to a project and to a request. Intercom
   or Crisp give you a generic chat blob with none of that. You would be trading your best feature
   for a widget.
3. **Free tiers are a trap here.** Intercom has no meaningful free tier. Crisp's free tier is 2
   seats and brands the widget. Tawk.to is free but looks like 2014 and will undercut a $6,000/mo
   positioning.
4. **Client data.** Pushing client project conversations into a third party is a real
   confidentiality question for an agency.

What in-house is missing, in priority order:
- **Real-time delivery.** Today it's local state. Polling every 10s is fine to launch; websockets later.
- **Notify you when a client writes.** This is the actual gap — an email or WhatsApp ping to the
  team, which n8n can do trivially off the API.
- **Unread counts** that are real rather than hardcoded to project 1.
- **File attachments** (the attach button is dead).
- Read receipts and typing indicators are nice-to-have; skip for launch.

The one thing worth outsourcing is **transactional email** (delivery notifications, invoice
reminders, password resets) — Resend or Postmark, both with usable free tiers. Do not build that.

---

## 8. Security — must fix before this is public

- **There is no authentication.** `Login.jsx` accepts any email containing `@` and any password of
  8+ characters, then sets `localStorage.portal_demo_authed`. `POST /api/client/login` exists and is
  not called.
- The route guard reads `localStorage` directly, so anyone can type
  `localStorage.setItem('portal_demo_authed','1')` in a console and be inside.
- No multi-tenancy: the portal shows one hardcoded client. There is no notion of *which* client is
  logged in, so connecting the API requires threading a client ID through everything.
- Settings shows a "Current / New access code" pair that does nothing, which is arguably worse than
  not having it — it implies a security control that isn't there.

---

## 9. Smaller bugs worth fixing while you're in there

1. **Queue drag-reorder is wrong when a project filter is active.** `Requests.jsx` passes the index
   *within the filtered column* to `store.reorderQueue`, which expects an index into the global
   queued list. Filter to one project, drag, and an unrelated request moves.
2. **`AnimatedNumber` freezes when `requestAnimationFrame` is throttled** (background tab). It only
   updates via rAF, so a value change while the tab is hidden is never painted. Add a fallback that
   snaps to the final value on `visibilitychange`.
3. `Deliverables.jsx` "Latest delivery" reads `files[0].at`, i.e. array order, not the newest date.
4. `Site.jsx` falls back to `domainsSeed`/`securitySeed`/`reportsSeed` when the store list is empty,
   so the page can show stale seed data alongside live store data.
5. `Messages.jsx` message shape is inconsistent — seeded messages have `name`, sent ones don't, so
   your own sent messages render with an empty author on re-render.
6. The Login page has no error message for a failed attempt (it just does nothing).

---

## 10. What I would do, in order

**Phase 1 — make it real (this is the launch blocker)**
1. Wire real auth against `POST /api/client/login`; add a client ID to the session; kill the
   `localStorage` guard.
2. Make **New Request** actually write — to the store first, then the API. Same for New Project.
3. Connect Messages, Tickets and Invoices to the endpoints that already exist.
4. Add file storage + a real download handler.

**Phase 2 — close the money loop**
5. Payment flow: amount, bank details, reference, "I've sent it", dashboard confirmation.
6. Next billing date + amount on the Billing page.
7. Plan change: confirmation dialog, effective date, proration rule, downgrade warning.
8. Retainer round-trip (`resumeSubscription`) and the hours economy.

**Phase 3 — make it trustworthy**
9. Empty states and onboarding for a brand-new client.
10. Toasts on every successful action; loading and error states.
11. Fix the §3 field mismatches and the hardcoded date.
12. Notify the team when a client messages or opens a ticket (n8n).

**Deliberately not now:** ratings, service catalogue / add-on purchasing, bundles, domain
registration, annual retainer billing. All are built-ish but none of them block a first client.

---

## Appendix — verification notes

- "Buttons with no handler" was produced by parsing every `<button>` opening tag in the live tree,
  then confirming each candidate by reading the source (a regex alone gives false positives,
  because `=>` inside an inline handler terminates the tag match).
- The blank Email rows, blank report headings, retainer one-way door, and correct `$6,000/month`
  monthly price were all confirmed against the running dev server, not inferred.
- The previously documented "monthly price doesn't change" bug is **not real** and has been
  retracted in `CURRENT-STATE.md`.
