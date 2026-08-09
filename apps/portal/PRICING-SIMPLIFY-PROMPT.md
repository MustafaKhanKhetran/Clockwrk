# Codex prompt — Portal pricing simplification

Restructure the portal's commercial model in `clockwrk-portal`. Two goals:

1. **Care is included in the retainer** — retainer clients never see a Care price or a Care chooser.
2. **The service catalog stops being a price list** — it becomes proof of what's included, and it appears in the New Request flow so clients know what they can ask for.

Files: `src/mocks.js`, `src/store.js`, `src/pages/Billing.jsx`, `src/pages/NewRequest.jsx`, `src/pages/Home.jsx`, `src/index.css`. Do not touch `MySite.jsx` except where noted.

---

## The model

Everything sold falls into exactly four buckets. The test is *"does it cost us more when the client says yes?"*

| Bucket | Priced? | Where it lives |
|---|---|---|
| **Retainer** — our team's hours | Weekly, by slot | Billing › Subscription |
| **Care** — automated monitoring/upkeep | **Included with retainer** | Billing › read-only panel |
| **Infrastructure** — real third-party cost | Metered per unit | My Site (already built) + Billing summary |
| **Capacity** — more/faster | Weekly | Billing › Add-ons (4 only) |

Anything that is *a person doing a task* is a **request**. It is never a priced line item for a retainer client.

---

## PART 1 — `src/mocks.js`

### 1a. Map plans to included Care tiers

```js
export const PLAN_CARE = {
  Startup: 'starter',
  Business: 'growth',
  Enterprise: 'business',
};
```

### 1b. Rewrite `CARE_PLANS` — absorb the strategy calls and monitoring items

```js
export const CARE_PLANS = [
  { id: 'starter', name: 'Starter Care', price: 200, cadence: 'mo', includes: [
    'Daily backups', 'Uptime monitoring', 'Core + plugin updates',
    'Managed SSL & DNS', 'Broken-link monitoring', 'Monthly health report',
  ] },
  { id: 'growth', name: 'Growth Care', price: 350, cadence: 'mo', includes: [
    'Everything in Starter', 'Performance monitoring', 'Security scanning',
    'SEO & keyword monitoring', 'Monthly performance report',
    'Malware removal', 'Monthly strategy call',
  ] },
  { id: 'business', name: 'Business Care', price: 650, cadence: 'mo', includes: [
    'Everything in Growth', 'Priority response', 'Advanced uptime monitoring',
    'Bi-weekly strategy calls', 'Quarterly security audit',
  ] },
];
```

### 1c. Cut `ADDONS` to four

Keep **only**: `slot`, `priority`, `whitelabel`, `hire`. **Delete** `strategy-biweekly` and `strategy-weekly` (now inside Care tiers).

### 1d. Delete `CARE_ADDONS` entirely

Reasons per item — remove all references anywhere in the app:
- `extra-hours` → that's an extra **slot**
- `security-plus` / `seo-plus` → now inside Care tiers
- `performance-tune` → it's a **request**
- `priority` → duplicate of `ADDONS.priority`
- `extra-infra` → belongs in My Site › Hosting/Email

### 1e. Tag every `SERVICE_ITEMS` entry with a `billing` field

Add `billing: 'included' | 'care' | 'infra'` to each of the 52 items. Exact classification:

**`billing: 'infra'` (8) — stays priced, real pass-through cost**
Shared hosting · WordPress hosting · WooCommerce hosting · VPS hosting · Staging environment · Starter mailbox · Team mailbox · Business mailbox

**`billing: 'care'` (11) — never priced separately; rendered as ticks inside the Care panel**
Plugin updates · Broken link monitoring · Monthly health report · Advanced uptime monitoring · SEO monitoring · Keyword tracking · Monthly performance report · Managed SSL certificate · Managed DNS · Malware removal · Bug fixes (all three tiers — collapse to one entry, hours scale with Care tier)

**`billing: 'included'` (everything else, ~33) — free for retainer clients, submit a request**
All of **Performance** (8) · all of **Setup** (6) · GA4 setup, Search Console setup, Conversion tracking, Heatmap setup · Technical SEO, On-page SEO, Local SEO setup · Security audit, Firewall setup, 2FA setup · Content updates (both tiers → collapse to one) · Forwarding and aliases · Email migration · Domain transfer · Subdomain setup · Managed site migration

### 1f. Derive a requestable list for the New Request page

```js
export const REQUESTABLE_SERVICES = SERVICE_CATALOG
  .filter((s) => s.billing === 'included')
  .reduce((acc, s) => {
    (acc[s.category] ||= []).push(s.name);
    return acc;
  }, {});
```

---

## PART 2 — `src/store.js`

- `carePlan` is **derived, not chosen**: `carePlan = PLAN_CARE[state.plan]`. Remove it from mutable state.
- Delete `subscribeCarePlan`. Delete `toggleEcom` if the ecom variant no longer applies to retainer clients — otherwise keep it as a Care upgrade toggle.
- `orderService` / `toggleService` / `requestService` must **reject** any item with `billing === 'included'`. If called with one, route to the New Request flow instead (navigate to `/requests/new` prefilled) — never charge.
- Keep the existing slot/queue logic untouched. Services still never consume slots at purchase time.

---

## PART 3 — `src/pages/Billing.jsx`

Current page has 6 sections. Reduce to **4**.

**Keep:** Subscription panel (retainer + capacity), Add-ons (now 4), Invoice history.

**Replace the Care Plan chooser** (line ~94–96) with a **read-only included panel**:

```
WEBSITE CARE
Growth Care · included with your Business plan
[✓ Daily backups] [✓ Uptime monitoring] [✓ Core + plugin updates] …
No extra charge — it's part of your weekly plan.
```

Style it as a single card with a lime "Included" badge. No price. No buttons. Pull the tier via `PLAN_CARE[plan]`.

**Replace "Browse all services"** (line ~111) with **"What your plan covers"** — same items, **prices removed**:

- Group by the 5 buckets as today (Run & maintain · Secure · Speed · Grow · Set up & launch)
- Render each item as a tick row, not a purchasable row
- Remove: price, quantity input, and Add/Order/Request buttons
- Footer line: *"All included — just send a request."* with a button linking to `/requests/new`
- Show only `billing === 'included'` items here. `care` items live in the Care panel; `infra` items live in My Site.

**Delete the Launch bundles section** for retainer clients (a launch is a request). Keep the `LAUNCH_BUNDLES` export in mocks for the non-retainer path only.

**Fix the summary strip** (line ~117–120): drop "Care plan / Active services / One-time orders / Recurring total". Replace with: Weekly plan · Care (included) · Infrastructure total · Next invoice.

---

## PART 4 — `src/pages/NewRequest.jsx` — the main new feature

The step *"What are we making?"* (line ~117) currently renders only `SERVICES` (creative work: Web App, Logo, Pitch Deck…).

**Add the technical services alongside it**, so clients discover they can ask for these too.

- Under the existing creative groups, add a second block headed **"Also included"** rendering `REQUESTABLE_SERVICES` grouped by category (Performance, Setup, Analytics, SEO, Security, Maintenance, Email, Domains).
- Each item is a selectable chip, identical interaction to the existing service chips — clicking sets `service` and prefills `title`.
- Add a small lime **"Included"** badge on this block's heading.
- Add one line of helper copy under the heading: *"Everything here is covered by your plan. No extra cost."*
- Collapse the "Also included" block behind a **"Show all services"** toggle if it makes the step too long — default collapsed, but make the toggle obvious.

Do **not** show `care` or `infra` items here. Those aren't requests.

---

## PART 5 — `src/pages/Home.jsx`

The plan panel currently shows the weekly price. Add one line beneath it: **"Care included"** with a tick. No other changes.

---

## Constraints

- Keep the existing plain-CSS design system in `src/index.css`. Match existing class naming (`billing-*`, `care-*`, `catalog-*`).
- Weekly cadence stays correct everywhere ($870 / $1,550 / $2,300 per **week**).
- Don't touch the request/slot logic or `enforceSlotCap`.
- Mock data only — no API wiring in this pass.
- Every price removed must be removed from the UI, not hidden with CSS.

## Verify

```bash
cd /Users/mustafakhetran/clockwrk-portal
npm run build
npm run dev
```

Then check: Billing shows 4 sections with zero Care prices · "What your plan covers" has no prices or buy buttons · New Request step 2 lists the technical services with an "Included" badge · clicking one prefills the title.
