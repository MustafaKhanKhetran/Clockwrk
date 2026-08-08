// Subscription change engine.
//
// Every plan/add-on change a client requests becomes a `subscription_changes`
// row that is NOT applied until money has arrived and the team has verified it.
// Capacity therefore never moves on a promise.
//
// The client picks how to pay, and the three modes are:
//
//   prorate_now   Pay the difference for the days left in the current cycle.
//                 Activates on verification. The billing date NEVER moves —
//                 with manual transfers, a predictable date matters more than
//                 precision.
//   at_renewal    Pay nothing now. Applies automatically at the next billing
//                 date at the new rate. Nothing to verify.
//   fresh_cycle   Start a new cycle today. Pay the full new price MINUS credit
//                 for the unused part of what they already bought. Crediting is
//                 deliberate: charging full price while they still have paid-for
//                 days left is the classic "why was I charged twice" dispute.
//
// Add-ons deliberately do not offer fresh_cycle — resetting the whole
// subscription cycle to add a slot would move the client's billing date for an
// unrelated reason.

import db from '../db.js';

export const PLANS = {
  startup:    { name: 'Startup',    slots: 1, weekly: 870,  monthly: 3350 },
  business:   { name: 'Business',   slots: 2, weekly: 1550, monthly: 6000 },
  enterprise: { name: 'Enterprise', slots: 3, weekly: 2300, monthly: 8950 },
};

export const ADDONS = {
  slot:       { name: 'Additional request slot', weekly: 400,  monthly: 1200, slots: 1 },
  priority:   { name: 'Priority queue',          weekly: 200,  monthly: 600,  slots: 0 },
  whitelabel: { name: 'White Label',             weekly: 550,  monthly: 1670, slots: 0 },
  hire:       { name: 'Hire From Us',            weekly: 1200, monthly: 3500, slots: 0 },
};

const CYCLE_DAYS = { weekly: 7, monthly: 30 };
const DAY_MS = 86400000;
const EXPIRY_DAYS = 7;

const priceOf = (item, cadence) => (cadence === 'monthly' ? item.monthly : item.weekly);
const money = (n) => Math.max(0, Math.round(n * 100) / 100);
const toISO = (d) => d.toISOString().slice(0, 10);

/** Days left before the next payment is due, floored at 0 and capped to a cycle. */
export function daysRemaining(nextDue, cadence) {
  const cycle = CYCLE_DAYS[cadence] || 30;
  if (!nextDue) return cycle;
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / DAY_MS);
  return Math.min(Math.max(days, 0), cycle);
}

/**
 * Price every option a client can pick, so the portal can show the real numbers
 * side by side instead of asking them to trust a single figure.
 */
export function quote({ kind, currentPlanKey, targetKey, cadence, currentCadence, targetCadence, nextDue, quantity = 1 }) {
  const fromCadence = currentCadence || cadence || 'weekly';
  const toCadence = targetCadence || cadence || fromCadence;
  const currentCycle = CYCLE_DAYS[fromCadence] || 30;
  const targetCycle = CYCLE_DAYS[toCadence] || 30;
  const remaining = daysRemaining(nextDue, fromCadence);
  const currentRatio = remaining / currentCycle;

  const current = kind === 'plan' ? PLANS[currentPlanKey] : null;
  const target = kind === 'plan' ? PLANS[targetKey] : ADDONS[targetKey];
  if (!target) throw new Error('Unknown plan or add-on');

  const currentPrice = current ? priceOf(current, fromCadence) : 0;
  const targetPrice = priceOf(target, toCadence) * quantity;

  // What the client has already paid for but not yet used.
  const unusedCredit = money(currentPrice * currentRatio);
  const targetForRemaining = money((targetPrice / targetCycle) * remaining);

  const renewal = nextDue ? toISO(new Date(nextDue)) : toISO(new Date(Date.now() + currentCycle * DAY_MS));
  const freshDate = toISO(new Date(Date.now() + targetCycle * DAY_MS));
  const followingBillingDate = toISO(new Date(new Date(renewal).getTime() + targetCycle * DAY_MS));

  const options = [
    {
      mode: 'prorate_now',
      label: 'Upgrade now, pay the difference',
      amountDue: money(targetForRemaining - unusedCredit),
      creditApplied: unusedCredit,
      activates: 'On payment verification',
      nextBillingDate: renewal,
      nextBillingAmount: targetPrice,
      detail: `${remaining} day${remaining === 1 ? '' : 's'} left in this cycle`,
    },
    {
      mode: 'at_renewal',
      label: 'Start at next renewal',
      amountDue: 0,
      creditApplied: 0,
      activates: renewal,
      nextBillingDate: renewal,
      nextBillingAmount: targetPrice,
      detail: 'Nothing to pay now',
    },
  ];

  // A fresh shorter cycle cannot absorb more credit than that cycle costs.
  // In that case the renewal and prorated options remain available instead of
  // silently discarding the client's remaining balance.
  if (kind === 'plan' && targetPrice >= unusedCredit) {
    options.push({
      mode: 'fresh_cycle',
      label: 'Start a fresh cycle now',
      // Full new period, minus the unused part of the old one.
      amountDue: money(targetPrice - unusedCredit),
      creditApplied: unusedCredit,
      activates: 'On payment verification',
      nextBillingDate: freshDate,
      nextBillingAmount: targetPrice,
      detail: 'Your billing date moves to today',
    });
  }

  return {
    remaining,
    cycle: currentCycle,
    cadence: toCadence,
    currentCadence: fromCadence,
    targetCadence: toCadence,
    followingBillingDate,
    currentPrice,
    targetPrice,
    unusedCredit,
    options,
  };
}

/** Short, human-checkable reference so transfers can be matched in a bank feed. */
export function paymentRef(clientId) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no easily-confused chars
  let tail = '';
  for (let i = 0; i < 4; i += 1) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CW-${clientId}-${tail}`;
}

export function expiryFor(mode) {
  // at_renewal needs no payment, so it never expires.
  if (mode === 'at_renewal') return null;
  return new Date(Date.now() + EXPIRY_DAYS * DAY_MS);
}

/**
 * Apply a verified change to the account. Called only after the team confirms
 * the money arrived.
 */
export async function applyChange(change) {
  const { client_id: clientId, kind, to_value: target, target_cadence: targetCadence, quantity, new_billing_date: newBillingDate } = change;

  if (kind === 'plan') {
    const plan = PLANS[target];
    if (!plan) throw new Error('Unknown plan');
    await db.execute(
      `UPDATE clients
          SET plan = ?, billing = COALESCE(?, billing)
        WHERE id = ?`,
      [target, targetCadence || null, clientId]
    );
  } else if (kind === 'addon') {
    const [[existing]] = await db.execute(
      "SELECT id, quantity FROM client_addons WHERE client_id = ? AND addon_id = ? AND status = 'active'",
      [clientId, target]
    );
    if (existing) {
      await db.execute('UPDATE client_addons SET quantity = quantity + ? WHERE id = ?', [quantity || 1, existing.id]);
    } else {
      await db.execute(
        "INSERT INTO client_addons (client_id, addon_id, quantity, status, activated_at) VALUES (?, ?, ?, 'active', CURDATE())",
        [clientId, target, quantity || 1]
      );
    }
  } else if (kind === 'cadence') {
    await db.execute('UPDATE clients SET billing = ? WHERE id = ?', [target, clientId]);
  }

  // fresh_cycle is the only mode that moves the billing date.
  if (newBillingDate) {
    await db.execute('UPDATE clients SET next_payment_due = ? WHERE id = ?', [newBillingDate, clientId]);
  }
}

/** Total parallel slots: plan slots plus any active slot add-ons. */
export async function slotsFor(clientId) {
  const [[client]] = await db.execute('SELECT plan FROM clients WHERE id = ?', [clientId]);
  const base = PLANS[client?.plan]?.slots || 1;
  const [[extra]] = await db.execute(
    "SELECT COALESCE(SUM(quantity),0) AS n FROM client_addons WHERE client_id = ? AND addon_id = 'slot' AND status = 'active'",
    [clientId]
  );
  return base + Number(extra.n || 0);
}

/**
 * Housekeeping, safe to call on a timer:
 *  - expire unpaid requests whose window has passed (the timer is paused the
 *    moment a client reports payment, so only people who never started expire)
 *  - apply scheduled changes that have reached their effective date
 *  - drop add-ons whose scheduled removal date has arrived
 */
export async function sweepChanges() {
  await db.execute(
    "UPDATE subscription_changes SET status = 'expired' WHERE status = 'awaiting_payment' AND expires_at IS NOT NULL AND expires_at < NOW()"
  );

  const [due] = await db.execute(
    "SELECT * FROM subscription_changes WHERE status = 'scheduled' AND effective_date IS NOT NULL AND effective_date <= CURDATE()"
  );
  for (const change of due) {
    await applyChange(change);
    await db.execute("UPDATE subscription_changes SET status = 'active', verified_at = NOW() WHERE id = ?", [change.id]);
  }

  await db.execute(
    "DELETE FROM client_addons WHERE status = 'scheduled_removal' AND ends_at IS NOT NULL AND ends_at <= CURDATE()"
  );
}
