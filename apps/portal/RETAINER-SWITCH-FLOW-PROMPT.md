# Codex prompt — Retainer switch flow (part 1 of 2)

Build the mechanism for a client to move from an active subscription onto a retainer. **This is the flow only** — the retainer-mode UI (header pill, Home tiles, hours counter, request flow) is part 2 and explicitly out of scope.

Files: `src/store.js`, `src/pages/Billing.jsx`, `src/pages/ProjectDetail.jsx`, `src/pages/Home.jsx`, `src/components/Modal.jsx` (reuse existing), `src/index.css`.

---

## The concept

A client's life has two stages:

- **Subscription** — we're actively building. Slots, unlimited requests. $870–2,300/wk.
- **Retainer** — the build shipped. We keep it running. $295–895/mo.

Retainer-level care is **included free** while on a subscription. When the project finishes, they move *down* to a retainer rather than cancelling. Today there is no way to make that move — `subscribeRetainer(id)` exists but only renders in a branch that never fires.

---

## PART 1 — Store

Add to state:
```js
accountMode: 'subscription',   // 'subscription' | 'retainer'
retainerTier: null,            // CARE_PLANS id once on a retainer
retainerCadence: 'monthly',    // 'monthly' | 'annual'
```

Add actions:
- `switchToRetainer(tierId, cadence = 'monthly')` — sets `accountMode: 'retainer'`, `retainerTier`, `retainerCadence`. Clears `plan` to `null`. Leaves existing requests untouched.
- `resumeSubscription(planName)` — sets `accountMode: 'subscription'`, restores `plan`, clears `retainerTier`.

Keep `setPaused` as-is; pausing and switching are different things.

The existing derived `carePlan = PLAN_CARE[plan]` must not break when `plan` is null — fall back to `retainerTier` when `accountMode === 'retainer'`.

---

## PART 2 — Pause / cancel becomes a three-way choice

The `Pause subscription` button (`Billing.jsx` ~line 91) currently toggles a `pausing` state. Replace with a modal offering three paths. **This is the churn-catcher — someone reaching for pause often just doesn't need active building any more.**

```
What would you like to do?

┌────────────────────────────────────────────┐
│ Pause subscription                         │
│ Keep your slots, stop the clock. Resume    │
│ any time.                                  │
├────────────────────────────────────────────┤
│ Switch to a retainer          ← RECOMMENDED│
│ Your build is done? We keep it running,    │
│ monitored and updated, from $295/mo.       │
├────────────────────────────────────────────┤
│ Cancel subscription                        │
│ End everything. Your files stay available  │
│ for 30 days.                               │
└────────────────────────────────────────────┘
```

- Middle option gets a lime `RECOMMENDED` badge and is visually dominant.
- "Switch to a retainer" → opens the retainer picker (Part 3).
- "Pause" → existing `setPaused(true)` behaviour.
- "Cancel" → confirm step, then no-op (mock).
- Pull the `$295` from `CARE_PLANS[0].price`, don't hardcode.

## PART 3 — Retainer picker

A modal (or a step inside the same modal) showing the three tiers as selectable cards. Reuse the card markup already built for the Billing retainer comparison section — same hours / response time / strategy rows, same Monthly/Annual toggle, same `recommended` flag on Care+.

- Selecting a tier + Confirm calls `switchToRetainer(tierId, cadence)`.
- Show a summary line before confirm: *"You'll move from Business ($6,000/mo) to Care+ ($495/mo) at the end of your current billing period."*
- After confirming, close the modal and show a success state on Billing.

## PART 4 — Project completion trigger

Projects have `status: 'complete'` in `mocks.js` (two of them already).

**On `ProjectDetail.jsx`** — when `project.status === 'complete'`, render a banner above the fold:

> 🎉 **{project.name} shipped.**
> Keep it running — monitoring, backups and updates from $295/mo.
> `[ See retainer options → ]`

The CTA opens the same retainer picker from Part 3.

**On `Home.jsx`** — if *any* project is `complete` and `accountMode === 'subscription'`, show a single dismissible strip with the same message, linking to Billing.

Both banners hide once `accountMode === 'retainer'`.

## PART 5 — Minimal retainer state on Billing

Enough that the flow is testable end-to-end. Full retainer-mode UI is part 2.

When `accountMode === 'retainer'`:
- Replace the dark subscription card with a **retainer card** in the same slot: tier name, price with cadence, `hoursIncluded` and `responseTime`, and a `Resume subscription` button calling `resumeSubscription('Business')`.
- Hide the "Request capacity / slots" card — retainers have no slots.
- Keep the retainer comparison section visible, with the current tier marked `YOUR PLAN` and the others offering `Switch`.
- The "What your plan covers" checklist stays.

Do **not** touch the header slots pill, Home tiles, or the request flow — those are part 2, and it's fine that they look wrong for now.

---

## Constraints

- Reuse the existing `Modal.jsx` component and current CSS conventions (`billing-*`, `care-*`).
- Full-opacity colors only — solid hex, no `rgba()` on surfaces, borders or fills. Shadows may keep alpha.
- Light and dark theme both work.
- Do not modify `mocks.js`. All prices come from `PLANS`, `CARE_PLANS`, `PLAN_CARE`, `RETAINER_EXTRA_HOURS`.
- Mock data only, no API wiring.
- Don't touch `NewRequest.jsx`, `MySite.jsx`, or the slot/queue logic.

## Verify

```bash
cd /Users/mustafakhetran/clockwrk-portal
npm run build
```

Then: Billing → Pause subscription → three options with retainer flagged RECOMMENDED → pick Care+ → confirm → subscription card is replaced by a Care+ retainer card, slots card gone, Resume subscription restores the Business plan. ProjectDetail for a completed project shows the shipped banner.
