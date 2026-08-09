# Codex prompt — Retainer-mode UI (part 2 of 2)

Part 1 built the switch. A client can now move from a subscription onto a retainer, and Billing adapts. **But the rest of the portal still assumes an active subscription** — the header says "2/2 slots in use", Home counts active projects, and the request flow is built around slots and queues. None of that means anything to a retainer client.

This part makes the whole portal behave correctly in retainer mode. The organising idea: **for a retainer client, hours replace slots.** Their entire relationship with you is *"how much of my 5 hours is left this month?"*

Files: `src/store.js`, `src/components/Layout.jsx`, `src/pages/Home.jsx`, `src/pages/Requests.jsx`, `src/pages/NewRequest.jsx`, `src/index.css`.

---

## PART 1 — Hours in the store

Add state:
```js
hoursUsed: 1.5,                    // hours consumed this cycle
hoursResetAt: 'Aug 18',            // display string, next reset
purchasedHours: 0,                 // from bought blocks
```

Add derived getters (compute in `useStore` or export helpers):
- `hoursIncluded` — `CARE_PLANS.find(t => t.id === retainerTier)?.hoursIncluded ?? 0`
- `hoursAllowance` — `hoursIncluded + purchasedHours`
- `hoursRemaining` — `Math.max(0, hoursAllowance - hoursUsed)`
- `hoursPct` — `hoursUsed / hoursAllowance` clamped 0–1

Add actions:
- `logHours(n)` — adds to `hoursUsed` (mock; call it when a retainer request is submitted, ~0.5h default)
- `buyHourBlock()` — adds `RETAINER_EXTRA_HOURS.block.hours` to `purchasedHours`
- `resetHours()` — zeroes `hoursUsed` and `purchasedHours` (mock the monthly reset)

All of this only applies when `accountMode === 'retainer'`. Subscription clients keep slots untouched.

---

## PART 2 — Header pill

`Layout.jsx` renders `{activeCount}/{totalSlots} slots in use`. Make it mode-aware:

**Subscription (unchanged):** `2/2 slots in use`

**Retainer:** `3.5 of 5 hours left`
- Two-dot indicator becomes a thin horizontal progress bar filled to `hoursPct`, lime when under 80%.
- At **≥80% used** the bar and text go amber.
- At **0 remaining** the pill goes red and reads `0 hours left · Buy more` and is clickable → opens the buy-hours prompt (Part 5).

Same pill dimensions and position — only the contents and colour change.

---

## PART 3 — Home in retainer mode

When `accountMode === 'retainer'`, replace the subscription-shaped content:

**Stat tiles** — swap the four tiles (`Active projects` / `Waiting on you` / `Up next` / `Completed`) for:

| Tile | Value | Sub |
|---|---|---|
| Care hours | `3.5` | of 5 left · resets {hoursResetAt} |
| Uptime | `99.99%` | last 30 days (from `hostingSeed`) |
| Next report | `Aug 1` | monthly health report |
| Renews | `{renewsAt}` | Care+ · $495/mo |

**Hero strip** — the dark "3 deliveries await approval" block only makes sense mid-build. In retainer mode replace with a **site health strip**:

> ✅ **Everything is running.**
> Uptime 99.99% · Last backup 4h ago · SSL valid · No security alerts
> `[ View My Site → ]`

If there *are* open retainer requests, keep the existing review block instead — health strip only shows when there's nothing awaiting them.

Greeting line changes from *"2 requests are moving and 3 deliveries need your review"* to *"Your site is healthy. 3.5 care hours left this month."*

---

## PART 4 — Requests page in retainer mode

`Requests.jsx` is built around slots and a queue. In retainer mode:

- Remove the slot/queue framing entirely (no "2/2 slots", no queue-position reordering).
- Add a header strip: **Care hours · 1.5 of 5 used** with the same progress bar as the header pill, plus `Buy 5 hours — $375` as a secondary button.
- Requests render as a simple chronological list. Each row shows the hours it consumed, e.g. `0.5h`.
- Keep status pills, comments, approvals — all unchanged.

---

## PART 5 — New Request in retainer mode

Two changes to `NewRequest.jsx`:

**a) Scope guard.** A retainer covers *changes and fixes*, not new builds. If the client picks a service from the big creative categories (Development / Design / Branding / Presence / Outdoor & Print — i.e. the `SERVICES` object), show an inline notice before they continue:

> **That sounds like a new project.**
> Retainers cover changes, fixes and upkeep. For a new build, restart your subscription and get dedicated slots.
> `[ Restart subscription ]`  `[ Continue anyway ]`

"Restart subscription" calls `resumeSubscription('Business')`. "Continue anyway" proceeds — don't hard-block.

The `REQUESTABLE_SERVICES` (technical) block needs no warning — that's exactly what a retainer is for.

**b) Hours estimate + overage.** On the final step, above Submit:

- `This will use approximately 0.5h of your 3.5 remaining hours.`
- If remaining is **0**, or the estimate exceeds remaining, swap to an amber notice:
  > **You're out of care hours this month.**
  > Buy 5 more for $375, upgrade to Care Pro (12 hrs/mo), or submit anyway and we'll bill $85/hr.
  > `[ Buy 5 hours — $375 ]` `[ Upgrade tier ]` `[ Submit anyway ]`

On submit in retainer mode, call `logHours(0.5)` instead of consuming a slot.

Pull `$375`, `5`, and `$85` from `RETAINER_EXTRA_HOURS` — never hardcode.

---

## Constraints

- **Every change is conditional on `accountMode === 'retainer'`.** Subscription mode must render exactly as it does today — verify by switching back with `resumeSubscription`.
- Reuse existing components and CSS conventions. No new dependencies.
- Full-opacity colors only — solid hex, no `rgba()` on surfaces, borders or fills. Shadows may keep alpha.
- Light and dark theme both work.
- Do not modify `mocks.js`. Values come from `CARE_PLANS`, `RETAINER_EXTRA_HOURS`, `hostingSeed`.
- Mock data only, no API wiring.

## Verify

```bash
cd /Users/mustafakhetran/clockwrk-portal
npm run build
```

Then, in the browser: Billing → Pause → Switch to a retainer → pick Care+ → confirm. Check that the header pill reads `3.5 of 5 hours left`, Home shows care hours / uptime / next report / renews with the health strip, Requests shows the hours bar and no slots, and New Request warns on a Development service and shows the hours estimate. Then hit `Resume subscription` and confirm everything reverts to the slot-based UI.
