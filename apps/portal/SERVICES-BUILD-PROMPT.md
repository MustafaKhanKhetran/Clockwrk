# Clockwrk Client Portal — Services Expansion Build Prompt

Spec for extending the **existing** `clockwrk-portal` (React 19 + Vite, plain-CSS design system in `src/index.css`, mock data). No UI/styling instructions — page skeletons and the design system already exist. This defines **what to add, fix, and improve, and where it lives in the current code.**

Guiding principle: **the client should not see a 60-item price menu.** They pick a Care Plan (the front door) and see what's included as a checklist. The full à-la-carte catalog is demoted to a collapsed "Browse all services." Keep the existing pattern: data in `src/mocks.js`, mutations in `src/store.js`, routes in `src/App.jsx`, nav in `src/components/Layout.jsx` (`NAV` array).

---

## Current structure (anchors — do not rebuild)

- **Pages** (`src/pages/`): `Home`, `Requests`, `NewRequest`, `RequestDetail`, `Files` (H1 "Deliverables"), `Projects`, `NewProject`, `ProjectDetail`, `Billing`, `Messages`, `Support`, `Settings`, `Login`.
  - **Delete** orphaned, unrouted: `Dashboard.jsx`, `Invoices.jsx`.
- **Routes:** `src/App.jsx` — `Protected` gates on `localStorage 'portal_demo_authed'`.
- **Nav:** `NAV` array in `src/components/Layout.jsx`.
- **Store actions** (`src/store.js`): `approve`, `requestRevision`, `addComment`, `rate`, `reorderQueue`, `buySlot`, `removeSlot`, `setPaused`, `setPlan`, `enforceSlotCap`.
- **Mock exports** (`src/mocks.js`): `me`, `SERVICES`, `projects`, `requestsSeed`, `ADDONS`, `PLANS`, `invoices`, `messages`, `tickets`, `activity`, `people`, `team`.

---

## Page plan — only ONE new page

Do **not** create separate Services / Hosting / Domains / Email / Security / Reports pages. Instead:

- **Extend `Billing.jsx`** → the "decide & pay" hub. Add sections: **Care Plan** (front door), **Add-ons** (short shelf), **Browse all services** (collapsed), **One-time / Launch**, plus existing plan + invoices. This replaces the idea of a separate Services page.
- **New `MySite.jsx` → `/site`** → the "operate & monitor" hub. One page, tabbed/sectioned: **Hosting · Domains · Email · Security · Reports**. This replaces 5 proposed pages with 1. Add a single `NAV` entry (e.g. label "My Site").
- **`Home.jsx`** → add a small status strip: uptime, upcoming renewals, expiring SSL/domains, new reports — links into `/site`.
- **`Projects.jsx` / `ProjectDetail.jsx`** → surface the Launch bundle upsell when a project completes.

Split of responsibility: **Billing = choose a plan / add services / see invoices. My Site = what's running, its status, and file/report downloads.**

---

## The simplified service model (client-facing)

Client sees **3 things**, never the raw 60-item list:

1. **Your Care Plan** — pick one tier; included services render as a **checklist of ticks, not priced lines**.
2. **Add-ons** — one short shelf (~6): Extra dev hours · Security+ · SEO+ · Performance tune-up · Priority queue · Extra mailboxes/VPS.
3. **One-time / Setup** — appears **in context only** (Launch bundle at project completion; a "Request a one-off" link otherwise). Not a standing menu.

**Browse all services** = the full catalog, collapsed by default, grouped into **5 plain buckets**: **Run & maintain · Secure · Speed · Grow · Set up & launch**. For clients who want one specific thing.

### Trim the tiers
- **Care plans: 3 self-serve** — Starter / Growth / Business.
- **Enterprise Care = "Custom — talk to us"** (contact flow, not a self-serve card).
- **E-commerce Care = a toggle/variant** on Growth or Business (for stores), not its own tier.
- **VPS Care = an add-on toggle**, not a plan.
- Net: 5 plan cards → 3 + a custom contact option.
- **Invoice stays short:** micro-services ($10–30/mo) live *inside* the Care plan, so an invoice reads "Growth Care $350/mo + 1–2 add-ons," not 10 tiny lines.

---

## PART 1 — FIX (corrections to existing mock/logic)

1. **Plans are WEEKLY, not monthly.** `PLANS` in `mocks.js`: Startup `$870/wk`, Business `$1,550/wk`, Enterprise `$2,300/wk`. Fix cadence everywhere plan price renders (`Billing.jsx`, `Home.jsx` plan panel, `RequestSheet`, `Requests.jsx` sub-header) and any monthly-total math.
2. **Replace `ADDONS`** (dual-cadence): White Label `$550/wk`|`$1,670/mo`, Hire From Us `$1,200/wk`|`$3,500/mo`, Additional slot `$400/wk`|`$1,200/mo`, Priority queue `$200/wk`|`$600/mo`, Strategy calls `$300/mo` (bi-weekly)|`$500/mo` (weekly). **Remove "Rush"** everywhere it's referenced (`Billing.jsx`, `NewProject.jsx`) → replace with Priority queue.
3. **Separate "requests" from "services."** Buying/managing a service must NOT go through the request/slot flow or `enforceSlotCap`. Requests = creative work only.

---

## PART 2 — Data + store

### `src/mocks.js` — add
- `CARE_PLANS` — 3 tiers `{ id, name, price, cadence:'mo', includes:[] }` + `ECOM_VARIANT` + `VPS_CARE` add-on + an `ENTERPRISE_CONTACT` flag.
- `SERVICE_CATALOG` — full à-la-carte list `{ id, bucket, name, price, cadence, buyModel, perUnit }`, `bucket` ∈ Run/Secure/Speed/Grow/Setup.
- `LAUNCH_BUNDLES` — `{ id, name, price, includes:[] }`.
- `domainsSeed`, `mailboxesSeed`, `hostingSeed` (accounts + backups + uptime), `securitySeed` (monitors + toggle state), `reportsSeed` (`{ id, type, period, generatedAt, url }`).
- Extend `invoices` items → `lineItems:[{ label, cadence, amount }]`.

### `src/store.js` — add state + actions
- State: `carePlan`, `serviceSubscriptions[]`, `serviceOrders[]`, `domains[]`, `mailboxes[]`, `hosting`, `securityMonitors`, `reports[]`.
- Actions: `subscribeCarePlan(id)`, `toggleEcom(on)`, `toggleAddon(id, cadence)`, `orderService(id, qty)`, `requestService(id)`, `toggleService(id, on)`, `registerDomain(name, tld)`, `setDomainAutoRenew(id, on)`, `toggleMonitor(id, on)`, `runBackup()`, `buyBundle(id)`.
- Leave `enforceSlotCap` and request slots untouched — services never affect slots.

### Buy models (store flows, not new request types)
Order (fixed price, instant, creates fulfillment task) · Request (quote → confirm → charge) · Toggle (recurring on/off) · Subscribe (tiered) · Register (domain: yearly + $10/mo mgmt) · Action (one-click, e.g. backup). Quantity items multiply by qty (on-page SEO/page, integrations/tool, extra mailbox, subdomain).

### Where each service lives
| Bucket / item | Where | Buy model | Cadence |
|---|---|---|---|
| Care plan tiers (Starter/Growth/Business) | Billing › Care Plan | Subscribe | monthly |
| E-commerce variant · VPS Care | Billing › Care Plan | Toggle | monthly |
| Enterprise | Billing › Care Plan | Request (contact) | — |
| Extra hours · Security+ · SEO+ · Perf tune-up · Priority queue · Extra mailboxes/VPS | Billing › Add-ons | Toggle/Order | wk or mo / one-time |
| Full à-la-carte (Run/Secure/Speed/Grow/Setup) | Billing › Browse all services | Order/Request/Toggle | mixed |
| Launch Essentials/Pro/Premium | Projects › Launch (on completion) | Order | one-time |
| Hosting plans, backups, uptime | My Site › Hosting | Order/Action/Toggle | monthly / per-backup |
| Domains, DNS, transfers, renewals | My Site › Domains | Register/Toggle/Request | yearly + $10/mo / one-time |
| Mailboxes, forwarding, migration | My Site › Email | Subscribe/Order/Request | monthly / one-time |
| SSL, malware, firewall, DDoS, 2FA, audits | My Site › Security | Toggle/Order/Request | monthly / one-time |
| Health / performance / SEO PDF reports | My Site › Reports | download | — |

---

## PART 3 — IMPROVE (existing gaps)

- **Auth:** add set-password, password-reset, first-run flows (`Login.jsx` only checks `localStorage`).
- **Teammates + roles:** invite users, basic roles (approve / see billing) — new section in `Settings.jsx`.
- **Notifications:** app-wide notifications + unread badges in `Layout.jsx` rail/topbar.
- **Downloads:** make invoice/report/file downloads actually retrieve (inert in `Files.jsx`, `Billing.jsx`, `RequestSheet`, `FileViewer`).
- **Accessibility:** queue rows in `Requests.jsx` are clickable `<div>`s — make keyboard-operable, add non-drag reorder controls, `aria-live` on "Saved"/approval toasts, `title`/`aria-label` on color-only online dots.
- **Previews:** standardize on thumbnail + open-in-new-tab (drop live `<iframe>` in `RequestSheet` and `FileViewer`; `ProjectSheet` already does this).
- **Consistency:** wire or remove Messages search; unify all "book a call" entry points into one scheduling flow with timezone.
- **Naming:** resolve `/files` route vs "Deliverables" H1.

---

## Order of work
1. Part 1 fixes (pricing/model) — unblocks everything.
2. Part 2 data/store scaffolding.
3. Extend `Billing.jsx` (Care Plan front door + add-ons + collapsed Browse-all) and add `MySite.jsx` (`/site`) + one `NAV` entry + Home status strip.
4. Part 3 improvements.
