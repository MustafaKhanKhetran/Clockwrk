export const PLANS = {
  startup: { name: "Startup", slots: 1, weekly: 870, monthly: 3350 },
  business: { name: "Business", slots: 2, weekly: 1550, monthly: 6000 },
  enterprise: { name: "Enterprise", slots: 3, weekly: 2300, monthly: 8950 },
} as const;

export const ADDONS = {
  slot: {
    name: "Additional request slot",
    weekly: 400,
    monthly: 1200,
    slots: 1,
  },
  priority: { name: "Priority queue", weekly: 200, monthly: 600, slots: 0 },
  whitelabel: { name: "White Label", weekly: 550, monthly: 1670, slots: 0 },
  hire: { name: "Hire From Us", weekly: 1200, monthly: 3500, slots: 0 },
} as const;

type Cadence = "weekly" | "monthly";
type PlanKey = keyof typeof PLANS;
type AddonKey = keyof typeof ADDONS;
export type SubscriptionChange = Record<string, unknown> & {
  id: number;
  client_id: number;
  kind: string;
  to_value: string;
  quantity?: number;
  target_cadence?: Cadence | null;
  new_billing_date?: string | null;
};
const CYCLE_DAYS: Record<Cadence, number> = { weekly: 7, monthly: 30 };
const DAY_MS = 86_400_000;
const priceOf = (item: { weekly: number; monthly: number }, cadence: Cadence) =>
  item[cadence];
const money = (value: number) => Math.max(0, Math.round(value * 100) / 100);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function daysRemaining(nextDue: unknown, cadence: Cadence) {
  const cycle = CYCLE_DAYS[cadence] || 30;
  if (!nextDue) return cycle;
  const days = Math.ceil(
    (new Date(String(nextDue)).getTime() - Date.now()) / DAY_MS,
  );
  return Math.min(Math.max(days, 0), cycle);
}

export function quote(input: {
  kind: "plan" | "addon";
  currentPlanKey: PlanKey;
  targetKey: PlanKey | AddonKey;
  cadence?: Cadence;
  currentCadence?: Cadence;
  targetCadence?: Cadence;
  nextDue?: unknown;
  quantity?: number;
}) {
  const from = input.currentCadence || input.cadence || "weekly";
  const to = input.targetCadence || input.cadence || from;
  const currentCycle = CYCLE_DAYS[from];
  const targetCycle = CYCLE_DAYS[to];
  const remaining = daysRemaining(input.nextDue, from);
  const ratio = remaining / currentCycle;
  const current = input.kind === "plan" ? PLANS[input.currentPlanKey] : null;
  const target =
    input.kind === "plan"
      ? PLANS[input.targetKey as PlanKey]
      : ADDONS[input.targetKey as AddonKey];
  if (!target) throw new Error("Unknown plan or add-on");
  const currentPrice = current ? priceOf(current, from) : 0;
  const targetPrice = priceOf(target, to) * (input.quantity || 1);
  const unusedCredit = money(currentPrice * ratio);
  const targetForRemaining = money((targetPrice / targetCycle) * remaining);
  const renewal = input.nextDue
    ? isoDate(new Date(String(input.nextDue)))
    : isoDate(new Date(Date.now() + currentCycle * DAY_MS));
  const freshDate = isoDate(new Date(Date.now() + targetCycle * DAY_MS));
  const followingBillingDate = isoDate(
    new Date(new Date(renewal).getTime() + targetCycle * DAY_MS),
  );
  const options: Array<Record<string, unknown>> = [
    {
      mode: "prorate_now",
      label: "Upgrade now, pay the difference",
      amountDue: money(targetForRemaining - unusedCredit),
      creditApplied: unusedCredit,
      activates: "On payment verification",
      nextBillingDate: renewal,
      nextBillingAmount: targetPrice,
      detail: `${remaining} day${remaining === 1 ? "" : "s"} left in this cycle`,
    },
    {
      mode: "at_renewal",
      label: "Start at next renewal",
      amountDue: 0,
      creditApplied: 0,
      activates: renewal,
      nextBillingDate: renewal,
      nextBillingAmount: targetPrice,
      detail: "Nothing to pay now",
    },
  ];
  if (input.kind === "plan" && targetPrice >= unusedCredit)
    options.push({
      mode: "fresh_cycle",
      label: "Start a fresh cycle now",
      amountDue: money(targetPrice - unusedCredit),
      creditApplied: unusedCredit,
      activates: "On payment verification",
      nextBillingDate: freshDate,
      nextBillingAmount: targetPrice,
      detail: "Your billing date moves to today",
    });
  return {
    remaining,
    cycle: currentCycle,
    cadence: to,
    currentCadence: from,
    targetCadence: to,
    followingBillingDate,
    currentPrice,
    targetPrice,
    unusedCredit,
    options,
  };
}

export function paymentRef(clientId: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 4; i += 1)
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CW-${clientId}-${tail}`;
}
export function expiryFor(mode: string) {
  return mode === "at_renewal"
    ? null
    : new Date(Date.now() + 7 * DAY_MS).toISOString();
}

export async function applyChange(db: D1Database, change: SubscriptionChange) {
  const clientId = Number(change.client_id);
  const target = String(change.to_value);
  if (change.kind === "plan") {
    if (!PLANS[target as PlanKey]) throw new Error("Unknown plan");
    await db
      .prepare(
        "UPDATE clients SET plan=?,billing=COALESCE(?,billing) WHERE id=?",
      )
      .bind(target, change.target_cadence || null, clientId)
      .run();
  } else if (change.kind === "addon") {
    const existing = await db
      .prepare(
        "SELECT id FROM client_addons WHERE client_id=? AND addon_id=? AND status='active'",
      )
      .bind(clientId, target)
      .first<{ id: number }>();
    if (existing)
      await db
        .prepare("UPDATE client_addons SET quantity=quantity+? WHERE id=?")
        .bind(Number(change.quantity || 1), existing.id)
        .run();
    else
      await db
        .prepare(
          "INSERT INTO client_addons (client_id,addon_id,quantity,status,activated_at) VALUES (?,?,?,'active',date('now'))",
        )
        .bind(clientId, target, Number(change.quantity || 1))
        .run();
  } else if (change.kind === "cadence") {
    await db
      .prepare("UPDATE clients SET billing=? WHERE id=?")
      .bind(target, clientId)
      .run();
  }
  if (change.new_billing_date)
    await db
      .prepare("UPDATE clients SET next_payment_due=? WHERE id=?")
      .bind(change.new_billing_date, clientId)
      .run();
}

export async function slotsFor(db: D1Database, clientId: number) {
  const client = await db
    .prepare("SELECT plan FROM clients WHERE id=?")
    .bind(clientId)
    .first<{ plan: PlanKey }>();
  const base = PLANS[client?.plan || "startup"]?.slots || 1;
  const extra = await db
    .prepare(
      "SELECT COALESCE(SUM(quantity),0) AS n FROM client_addons WHERE client_id=? AND addon_id='slot' AND status='active'",
    )
    .bind(clientId)
    .first<{ n: number }>();
  return base + Number(extra?.n || 0);
}

export async function sweepChanges(db: D1Database) {
  await db
    .prepare(
      "UPDATE subscription_changes SET status='expired' WHERE status='awaiting_payment' AND expires_at IS NOT NULL AND expires_at<datetime('now')",
    )
    .run();
  const due = (
    await db
      .prepare(
        "SELECT * FROM subscription_changes WHERE status='scheduled' AND effective_date IS NOT NULL AND date(effective_date)<=date('now')",
      )
      .all<SubscriptionChange>()
  ).results;
  for (const change of due) {
    await applyChange(db, change);
    await db
      .prepare(
        "UPDATE subscription_changes SET status='active',verified_at=CURRENT_TIMESTAMP WHERE id=?",
      )
      .bind(change.id)
      .run();
  }
  await db
    .prepare(
      "DELETE FROM client_addons WHERE status='scheduled_removal' AND ends_at IS NOT NULL AND date(ends_at)<=date('now')",
    )
    .run();
}
