import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";
import { requireClient } from "../middleware/auth";
import {
  ADDONS,
  PLANS,
  expiryFor,
  paymentRef,
  quote,
  slotsFor,
  sweepChanges,
} from "../services/billingChanges";

type App = { Bindings: Env; Variables: Variables };
type Ctx = Context<App>;
type Row = Record<string, any>;
type PlanKey = keyof typeof PLANS;
type AddonKey = keyof typeof ADDONS;
type Cadence = "weekly" | "monthly";
const app = new Hono<App>();
const body = (c: Ctx): Promise<Row> => c.req.json<Row>().catch(() => ({}));
const cid = (c: Ctx) => c.get("client")!.id;
const planKey = (value: unknown) =>
  String(value || "").toLowerCase() as PlanKey;
const followingDate = (effective: unknown, cadence: string) => {
  if (!effective) return null;
  const date = new Date(String(effective));
  date.setUTCDate(date.getUTCDate() + (cadence === "monthly" ? 30 : 7));
  return date.toISOString().slice(0, 10);
};

app.get("/billing/payment-details", requireClient, async (c) => {
  const rows = (
    await c.env.DB.prepare(
      "SELECT setting_key,setting_value FROM app_settings WHERE setting_key LIKE 'pay_%'",
    ).all<{ setting_key: string; setting_value: string }>()
  ).results;
  const map = Object.fromEntries(
    rows.map((row) => [row.setting_key, row.setting_value]),
  );
  return c.json({
    success: true,
    payment: {
      beneficiary: map.pay_beneficiary || null,
      bankName: map.pay_bank_name || null,
      accountNumber: map.pay_account_number || null,
      routingNumber: map.pay_routing_number || null,
      currency: map.pay_currency || "USD",
    },
  });
});

app.get("/billing/summary", requireClient, async (c) => {
  await sweepChanges(c.env.DB);
  const client = await c.env.DB.prepare(
    "SELECT plan,billing,next_payment_due FROM clients WHERE id=?",
  )
    .bind(cid(c))
    .first<Row>();
  const [addons, changes] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT id,addon_id,quantity,status,ends_at FROM client_addons WHERE client_id=?",
    ).bind(cid(c)),
    c.env.DB.prepare(
      `SELECT id,kind,direction,mode,from_value,to_value,target_cadence,quantity,amount_due,amount_received,credit_applied,payment_ref,status,effective_date,new_billing_date,requested_at,expires_at FROM subscription_changes WHERE client_id=? AND status IN ('awaiting_payment','payment_reported','partially_paid','scheduled') ORDER BY requested_at DESC`,
    ).bind(cid(c)),
  ]);
  return c.json({
    success: true,
    plan: client?.plan || null,
    cadence: client?.billing || "weekly",
    nextBillingDate: client?.next_payment_due || null,
    slots: await slotsFor(c.env.DB, cid(c)),
    addons: (addons!.results as Row[]).map((addon) => ({
      ...addon,
      name: ADDONS[addon.addon_id as AddonKey]?.name || addon.addon_id,
    })),
    pendingChanges: changes!.results,
  });
});

app.get("/billing/quote", requireClient, async (c) => {
  const kind = c.req.query("kind") || "plan";
  const target = c.req.query("target") || "";
  const quantity = Number(c.req.query("quantity")) || 1;
  const cadence = c.req.query("cadence");
  const client = await c.env.DB.prepare(
    "SELECT plan,billing,next_payment_due FROM clients WHERE id=?",
  )
    .bind(cid(c))
    .first<Row>();
  const currentCadence = (client?.billing || "weekly") as Cadence;
  const currentKey = planKey(client?.plan);
  if (kind === "cadence") {
    if (!new Set(["weekly", "monthly"]).has(target))
      return c.json(
        { success: false, message: "Unknown billing cadence" },
        400,
      );
    if (target === currentCadence)
      return c.json(
        {
          success: false,
          message: `You are already billed ${currentCadence}.`,
        },
        400,
      );
    const plan = PLANS[currentKey];
    return c.json({
      success: true,
      cadenceChange: true,
      target,
      currentCadence,
      effectiveDate: client?.next_payment_due || null,
      currentPrice: plan?.[currentCadence] || 0,
      newPrice: plan?.[target as Cadence] || 0,
      followingBillingDate: followingDate(client?.next_payment_due, target),
    });
  }
  if (kind === "plan" && !PLANS[target as PlanKey])
    return c.json({ success: false, message: "Unknown plan" }, 400);
  if (kind === "addon" && !ADDONS[target as AddonKey])
    return c.json({ success: false, message: "Unknown add-on" }, 400);
  const targetCadence = (
    kind === "plan" ? cadence || currentCadence : currentCadence
  ) as Cadence;
  if (!new Set(["weekly", "monthly"]).has(targetCadence))
    return c.json({ success: false, message: "Unknown billing cadence" }, 400);
  const downgrade =
    kind === "plan" && PLANS[target as PlanKey].slots < PLANS[currentKey].slots;
  if (downgrade)
    return c.json({
      success: true,
      downgrade: true,
      effectiveDate: client?.next_payment_due,
      currentCadence,
      targetCadence,
      newPrice: PLANS[target as PlanKey][targetCadence],
      followingBillingDate: followingDate(
        client?.next_payment_due,
        targetCadence,
      ),
      newSlots: PLANS[target as PlanKey].slots,
      currentSlots: await slotsFor(c.env.DB, cid(c)),
    });
  try {
    return c.json({
      success: true,
      downgrade: false,
      ...quote({
        kind: kind as "plan" | "addon",
        currentPlanKey: currentKey,
        targetKey: target as PlanKey | AddonKey,
        currentCadence,
        targetCadence,
        nextDue: client?.next_payment_due,
        quantity,
      }),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not price that change",
      },
      400,
    );
  }
});

app.post("/billing/changes", requireClient, async (c) => {
  const b = await body(c);
  const kind = String(b.kind || "plan");
  const target = String(b.target || "");
  const mode = String(b.mode || "prorate_now");
  const quantity = Number(b.quantity) || 1;
  const client = await c.env.DB.prepare(
    "SELECT plan,billing,next_payment_due FROM clients WHERE id=?",
  )
    .bind(cid(c))
    .first<Row>();
  const currentKey = planKey(client?.plan);
  const currentCadence = (client?.billing || "weekly") as Cadence;
  const targetCadence = (
    kind === "plan" ? b.cadence || currentCadence : currentCadence
  ) as Cadence;
  if (kind === "plan" && !new Set(["weekly", "monthly"]).has(targetCadence))
    return c.json({ success: false, message: "Unknown billing cadence" }, 400);
  const open = await c.env.DB.prepare(
    "SELECT id FROM subscription_changes WHERE client_id=? AND status IN ('awaiting_payment','payment_reported','partially_paid','scheduled')",
  )
    .bind(cid(c))
    .first();
  if (open)
    return c.json(
      {
        success: false,
        message:
          "You already have a change awaiting payment. Complete or cancel it first.",
      },
      409,
    );
  if (kind === "cadence") {
    if (!new Set(["weekly", "monthly"]).has(target))
      return c.json(
        { success: false, message: "Unknown billing cadence" },
        400,
      );
    if (target === currentCadence)
      return c.json(
        {
          success: false,
          message: `You are already billed ${currentCadence}.`,
        },
        400,
      );
    const effective =
      client?.next_payment_due || new Date().toISOString().slice(0, 10);
    const ref = paymentRef(cid(c));
    const result = await c.env.DB.prepare(
      `INSERT INTO subscription_changes (client_id,kind,direction,mode,from_value,to_value,quantity,full_price,credit_applied,amount_due,payment_ref,status,effective_date,notes) VALUES (?,'cadence','switch','at_renewal',?,?,1,0,0,0,?,'scheduled',?,?)`,
    )
      .bind(cid(c), currentCadence, target, ref, effective, b.notes || null)
      .run();
    await c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Billing cadence change',?,'/finance')",
    )
      .bind(
        `${c.get("client")!.name}: switching to ${target} billing from ${effective}`,
      )
      .run();
    return c.json(
      {
        success: true,
        id: result.meta.last_row_id,
        scheduled: true,
        effectiveDate: effective,
      },
      201,
    );
  }
  if (kind === "plan" && !PLANS[target as PlanKey])
    return c.json({ success: false, message: "Unknown plan" }, 400);
  if (kind === "addon" && !ADDONS[target as AddonKey])
    return c.json({ success: false, message: "Unknown add-on" }, 400);
  const downgrade =
    kind === "plan" && PLANS[target as PlanKey].slots < PLANS[currentKey].slots;
  const removal = kind === "addon" && mode === "remove";
  if (downgrade || removal) {
    const effective = client?.next_payment_due || null;
    const result = await c.env.DB.prepare(
      `INSERT INTO subscription_changes (client_id,kind,direction,mode,from_value,to_value,target_cadence,quantity,full_price,credit_applied,amount_due,payment_ref,status,effective_date,notes) VALUES (?,?,?,'at_renewal',?,?,?,?,0,0,0,?,'scheduled',?,?)`,
    )
      .bind(
        cid(c),
        kind,
        removal ? "remove" : "downgrade",
        currentKey,
        target,
        kind === "plan" ? targetCadence : null,
        quantity,
        paymentRef(cid(c)),
        effective,
        b.notes || null,
      )
      .run();
    if (removal)
      await c.env.DB.prepare(
        "UPDATE client_addons SET status='scheduled_removal',ends_at=? WHERE client_id=? AND addon_id=?",
      )
        .bind(effective, cid(c), target)
        .run();
    return c.json(
      {
        success: true,
        id: result.meta.last_row_id,
        scheduled: true,
        effectiveDate: effective,
      },
      201,
    );
  }
  const priced = quote({
    kind: kind as "plan" | "addon",
    currentPlanKey: currentKey,
    targetKey: target as PlanKey | AddonKey,
    currentCadence,
    targetCadence,
    nextDue: client?.next_payment_due,
    quantity,
  });
  const chosen = priced.options.find((option) => option.mode === mode);
  if (!chosen)
    return c.json(
      {
        success: false,
        message: "That option is not available for this change",
      },
      400,
    );
  const ref = paymentRef(cid(c));
  const amount = Number(chosen.amountDue);
  const status = amount > 0 ? "awaiting_payment" : "scheduled";
  const result = await c.env.DB.prepare(
    `INSERT INTO subscription_changes (client_id,kind,direction,mode,from_value,to_value,target_cadence,quantity,full_price,credit_applied,amount_due,payment_ref,status,effective_date,new_billing_date,expires_at,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      cid(c),
      kind,
      kind === "addon" ? "add" : "upgrade",
      mode,
      currentKey,
      target,
      kind === "plan" ? targetCadence : null,
      quantity,
      priced.targetPrice,
      chosen.creditApplied,
      amount,
      ref,
      status,
      mode === "at_renewal" ? client?.next_payment_due : null,
      mode === "fresh_cycle" ? chosen.nextBillingDate : null,
      amount > 0 ? expiryFor(mode) : null,
      b.notes || null,
    )
    .run();
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Subscription change requested',?,'/finance')",
  )
    .bind(
      `${c.get("client")!.name}: ${target} · ${targetCadence} (${mode}) — $${amount} due, ref ${ref}`,
    )
    .run();
  return c.json(
    {
      success: true,
      id: result.meta.last_row_id,
      paymentRef: ref,
      amountDue: amount,
      status,
    },
    201,
  );
});

app.post("/billing/changes/:id/reported", requireClient, async (c) => {
  const change = await c.env.DB.prepare(
    "SELECT id,payment_ref,amount_due FROM subscription_changes WHERE id=? AND client_id=? AND status='awaiting_payment'",
  )
    .bind(c.req.param("id"), cid(c))
    .first<Row>();
  if (!change)
    return c.json({ success: false, message: "No open change found" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE subscription_changes SET status='payment_reported',reported_at=CURRENT_TIMESTAMP,expires_at=NULL WHERE id=?",
    ).bind(change.id),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Transfer reported — verify it',?,'/finance')",
    ).bind(
      `${c.get("client")!.name} reported $${change.amount_due} sent, ref ${change.payment_ref}`,
    ),
  ]);
  return c.json({ success: true });
});

app.post("/billing/changes/:id/cancel", requireClient, async (c) => {
  const change = await c.env.DB.prepare(
    "SELECT id,kind,to_value FROM subscription_changes WHERE id=? AND client_id=? AND status IN ('awaiting_payment','payment_reported','scheduled')",
  )
    .bind(c.req.param("id"), cid(c))
    .first<Row>();
  if (!change)
    return c.json({ success: false, message: "Change not found" }, 404);
  const statements = [
    c.env.DB.prepare(
      "UPDATE subscription_changes SET status='cancelled' WHERE id=?",
    ).bind(change.id),
  ];
  if (change.kind === "addon")
    statements.push(
      c.env.DB.prepare(
        "UPDATE client_addons SET status='active',ends_at=NULL WHERE client_id=? AND addon_id=? AND status='scheduled_removal'",
      ).bind(cid(c), change.to_value),
    );
  await c.env.DB.batch(statements);
  return c.json({ success: true });
});

export default app;
