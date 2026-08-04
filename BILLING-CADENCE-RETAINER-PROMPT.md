# Codex prompt — Billing cadence toggle + retainer comparison

Two features for `clockwrk-portal`. Pricing data is already correct in `src/mocks.js` — this is purely surfacing it. Files: `src/pages/Billing.jsx`, `src/index.css`, and `src/store.js` only.

---

## Data already available (do not change it)

`PLANS` — each entry now has a monthly price:
```js
{ name: 'Startup',    slots: 1, price: 870,  cadence: 'wk', monthlyPrice: 3350 }
{ name: 'Business',   slots: 2, price: 1550, cadence: 'wk', monthlyPrice: 6000 }
{ name: 'Enterprise', slots: 3, price: 2300, cadence: 'wk', monthlyPrice: 8950 }
```

`CARE_PLANS` — the retainer product, three tiers:
```js
{ id, name, price, cadence: 'mo', annualPrice, hoursIncluded, responseTime,
  strategyCall, recommended?, includes: [...] }
```
Values: Care $295/$2,950 · 2 hrs · "2 business days" — Care+ $495/$4,950 · 5 hrs · "Next business day" · `recommended: true` · "Monthly (30 min)" — Care Pro $895/$8,950 · 12 hrs · "4 business hours" · "Quarterly deep-dive"

`RETAINER_EXTRA_HOURS` — `{ hourly: 85, block: { hours: 5, price: 375 } }`

`PLAN_CARE` — maps plan name → included retainer tier id (Startup→starter, Business→growth, Enterprise→business)

---

## PART 1 — Weekly / Monthly toggle on the subscription card

The dark subscription panel currently shows only `Weekly retainer · $1,550/wk`. Add a cadence switch.

**Store:** add `billingCadence: 'weekly' | 'monthly'` to state (default `'weekly'`) and an action `setBillingCadence(next)`.

**UI:** a small pill toggle in the subscription card, styled like the existing `.cl-view-toggle` / segmented controls — two options, `Weekly` and `Monthly`, active one filled.

When **Weekly** is selected:
```
Weekly retainer
$1,550/wk
```

When **Monthly** is selected:
```
Monthly retainer
$6,000/mo          [Save $717/mo]
```

- Compute the saving as `Math.round(plan.price * 4.3333 - plan.monthlyPrice)` — do not hardcode it.
- Render the saving as a small lime badge next to the price.
- Add one line of helper text under the toggle: **"Weekly — pause or cancel any week. Monthly — save ~10%, billed upfront."**

Also update the `Change plan` flow (if it lists plans) to show whichever cadence is currently selected.

---

## PART 2 — Retainer comparison section

Add a new section to `Billing.jsx`, placed **directly below the existing included-Care panel** and above "What your plan covers".

### Two states

**A. Client is on a subscription** (current mock state — `plan` is set):
This is a preview of what happens after their build ships, not something they buy now.

- Kicker: `AFTER YOUR PROJECT SHIPS`
- Heading: `Keep it running`
- Sub: `When your build is complete, you move onto a retainer. Your current plan includes ${CARE_PLANS.find(tierIncluded).name} at no extra cost.`
- Render the three tiers as **read-only comparison cards** — no buy buttons.
- Mark the tier included with their current plan (via `PLAN_CARE[plan]`) with a lime `INCLUDED WITH YOUR PLAN` badge.

**B. No active subscription** (`plan` is null/empty):
Retainer is the primary product.
- Kicker: `WEBSITE CARE`
- Heading: `Choose your retainer`
- Render the same three cards **with a `Choose plan` button** on each, wired to a new store action `subscribeRetainer(id)`.

Detect state with the existing `plan` from the store. Build both paths; state B won't trigger in the current mock but must not error.

### Card design

Three cards side by side (`grid-template-columns: repeat(3, 1fr)`, stacking to 1 column under 900px). Each card:

```
┌─────────────────────────────┐
│  CARE+          ⭐ RECOMMENDED│   ← lime badge if tier.recommended
│  $495 /mo                    │
│  or $4,950/yr — 2 months free│   ← from annualPrice
│  ─────────────────────────── │
│  ⏱  5 hours included         │   ← hoursIncluded, prominent
│  ⚡  Next business day        │   ← responseTime
│  📞  Monthly (30 min)         │   ← strategyCall, omit row if null
│  ─────────────────────────── │
│  ✓ Everything in Care        │
│  ✓ Performance monitoring…   │   ← includes[]
│  ✓ …                         │
└─────────────────────────────┘
```

- The `recommended` card gets a subtle lime border and slight scale-up so it reads as the default choice.
- **Hours / response / strategy are the three headline rows** — style them distinctly from the `includes` tick list (bigger, with an icon, above a divider). These are the upgrade levers and must be scannable.
- Omit the strategy row entirely when `strategyCall` is `null`.

### Monthly / Annual toggle

One toggle above the three cards, same pill style as Part 1. Switching to Annual swaps each card's price to `annualPrice` with `/yr` and shows a small `2 months free` note.

### Extra-hours footnote

Under the cards, one muted line:
> **Need more hours?** $85/hr, or a 5-hour block for $375.

Pull both numbers from `RETAINER_EXTRA_HOURS` — do not hardcode.

---

## Constraints

- Plain CSS in `src/index.css`, matching existing `billing-*` / `care-*` naming. No new dependencies.
- Full-opacity colors only — solid hex, no `rgba()` on surfaces, borders or fills. Shadows may keep alpha.
- Light and dark theme both need to work (the portal has a theme toggle).
- Do not touch `mocks.js`, `NewRequest.jsx`, `MySite.jsx`, or the request/slot logic.
- Mock data only, no API wiring.

## Verify

```bash
cd /Users/mustafakhetran/clockwrk-portal
npm run build
```

Then check: subscription card toggles between `$1,550/wk` and `$6,000/mo · Save $717/mo` · retainer section shows 3 cards with Care+ flagged recommended and Care+ badged as included with the Business plan · monthly/annual toggle swaps to `$4,950/yr` · extra-hours line reads $85/hr and $375.
