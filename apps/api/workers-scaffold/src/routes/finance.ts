import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee, requireRoles } from "../middleware/auth";
import {
  applyChange,
  sweepChanges,
  type SubscriptionChange,
} from "../services/billingChanges";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const FINANCE_ACCESS = ["owner", "admin", "finance"];

function invoiceBody(payment: {
  id: number;
  amount: number;
  payment_ref?: string | null;
  plan?: string | null;
  billing?: string | null;
}) {
  const invoice = `INV-${String(payment.id).padStart(4, "0")}`;
  const planLine = [payment.plan, payment.billing].filter(Boolean).join(" · ");
  const paidOn = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Payment confirmed — thank you.\n\n${invoice} · $${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on ${paidOn}${planLine ? ` · ${planLine}` : ""}${payment.payment_ref ? ` · reference ${payment.payment_ref}` : ""}\n\nYour full billing history is in the Billing page.`;
}

app.get("/", requireEmployee, requireRoles(...FINANCE_ACCESS), async (c) => {
  const [payments, expenses, employees, revenue, releases] =
    await c.env.DB.batch([
      c.env.DB.prepare(
        "SELECT id,name,email,company,plan,billing,amount,fee_usd,received_usd,exchange_rate,received_pkr,whitelabel,txn_id,payment_ref,referral_code,status,submitted_at,confirmed_at FROM payments ORDER BY submitted_at DESC",
      ),
      c.env.DB.prepare(
        "SELECT id,category,description,amount,currency,date,notes,created_at FROM expenses ORDER BY date DESC",
      ),
      c.env.DB.prepare(
        "SELECT id,name,email,role,salary,department,status FROM employees WHERE status='active' ORDER BY name",
      ),
      c.env.DB.prepare(
        "SELECT strftime('%Y-%m',confirmed_at) AS month,COALESCE(SUM(amount),0) AS revenue_usd,COALESCE(SUM(received_pkr),0) AS revenue_pkr,COALESCE(AVG(exchange_rate),275.62) AS avg_rate FROM payments WHERE status='confirmed' AND datetime(confirmed_at)>=datetime('now','-6 months') GROUP BY month ORDER BY month",
      ),
      c.env.DB.prepare(
        "SELECT pr.*,e.name AS requester_name,e.email AS requester_email,e.role AS requester_role,rel.name AS releaser_name FROM payment_releases pr LEFT JOIN employees e ON e.id=pr.requested_by LEFT JOIN employees rel ON rel.id=pr.released_by ORDER BY pr.requested_at DESC",
      ),
    ]);
  return c.json({
    success: true,
    payments: payments?.results ?? [],
    expenses: expenses?.results ?? [],
    employees: employees?.results ?? [],
    revenue_chart: revenue?.results ?? [],
    releases: releases?.results ?? [],
  });
});

app.post(
  "/payments/:id/confirm",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body: { exchange_rate?: number; fee_usd?: number } = await c.req
      .json<{ exchange_rate?: number; fee_usd?: number }>()
      .catch(() => ({}));
    const payment = await c.env.DB.prepare("SELECT * FROM payments WHERE id=?")
      .bind(id)
      .first<Record<string, unknown>>();
    if (!payment)
      return c.json({ success: false, message: "Payment not found" }, 404);
    const fee = Number(body.fee_usd || 30);
    const rate = Number(body.exchange_rate || 275.62);
    const received = Number(payment.amount) - fee;
    const pkr = received * rate;
    const existing = await c.env.DB.prepare(
      "SELECT id FROM clients WHERE email=?",
    )
      .bind(payment.email)
      .first<{ id: number }>();
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare(
        "UPDATE payments SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP,fee_usd=?,received_usd=?,exchange_rate=?,received_pkr=? WHERE id=?",
      ).bind(fee, received, rate, pkr, id),
    ];
    if (!existing) {
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO clients (name,email,company,plan,billing,whitelabel,status,payment_ref,referral_code,subscribed_at) VALUES (?,?,?,?,?,?,'active',?,?,CURRENT_TIMESTAMP)",
        ).bind(
          payment.name,
          payment.email,
          payment.company,
          payment.plan,
          payment.billing,
          payment.whitelabel,
          payment.payment_ref,
          payment.referral_code || "",
        ),
      );
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO projects (client_id,name,status) SELECT id,?,'active' FROM clients WHERE email=?",
        ).bind(
          `${String(payment.company || payment.name)} Project`,
          payment.email,
        ),
      );
    }
    statements.push(
      c.env.DB.prepare(
        "UPDATE payments SET client_id=(SELECT id FROM clients WHERE email=? LIMIT 1) WHERE id=?",
      ).bind(payment.email, id),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Payment confirmed',?,'/finance')",
      ).bind(`${String(payment.name)} — $${Number(payment.amount)} confirmed`),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO client_messages (client_id,sender,content) SELECT id,'team',? FROM clients WHERE email=? LIMIT 1",
      ).bind(
        invoiceBody({
          id,
          amount: Number(payment.amount),
          payment_ref: String(payment.payment_ref || ""),
          plan: String(payment.plan || ""),
          billing: String(payment.billing || ""),
        }),
        payment.email,
      ),
    );
    await c.env.DB.batch(statements);
    return c.json({ success: true });
  },
);

app.post(
  "/expenses",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    const result = await c.env.DB.prepare(
      "INSERT INTO expenses (category,description,amount,currency,date,added_by,notes) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        b.category,
        b.description,
        b.amount,
        b.currency || "PKR",
        b.date,
        c.get("employee")!.id,
        b.notes || "",
      )
      .run();
    return c.json({
      success: true,
      expense: await c.env.DB.prepare("SELECT * FROM expenses WHERE id=?")
        .bind(result.meta.last_row_id)
        .first(),
    });
  },
);
app.patch(
  "/expenses/:id",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    const id = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE expenses SET category=?,description=?,amount=?,currency=?,date=?,notes=? WHERE id=?",
    )
      .bind(
        b.category,
        b.description,
        b.amount,
        b.currency || "PKR",
        b.date,
        b.notes || "",
        id,
      )
      .run();
    return c.json({
      success: true,
      expense: await c.env.DB.prepare("SELECT * FROM expenses WHERE id=?")
        .bind(id)
        .first(),
    });
  },
);
app.delete(
  "/expenses/:id",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    await c.env.DB.prepare("DELETE FROM expenses WHERE id=?")
      .bind(c.req.param("id"))
      .run();
    return c.json({ success: true });
  },
);

app.post("/releases", requireEmployee, async (c) => {
  const b = await c.req.json<{
    amount_usd: unknown;
    fee_usd?: unknown;
    notes?: string;
  }>();
  const amount = Number(b.amount_usd);
  if (!Number.isFinite(amount) || amount <= 0)
    return c.json(
      { success: false, message: "Valid amount_usd is required" },
      400,
    );
  const result = await c.env.DB.prepare(
    "INSERT INTO payment_releases (requested_by,amount_usd,fee_usd,notes) VALUES (?,?,?,?)",
  )
    .bind(
      c.get("employee")!.id,
      amount,
      Number(b.fee_usd || 30),
      b.notes || null,
    )
    .run();
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Release requested',?,'/finance')",
  )
    .bind(
      `${c.get("employee")!.email} requested $${amount} release from ElevatePay`,
    )
    .run();
  return c.json({ success: true, id: result.meta.last_row_id });
});
app.patch(
  "/releases/:id",
  requireEmployee,
  requireRoles("owner", "admin"),
  async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    if (!["approved", "rejected"].includes(String(b.status)))
      return c.json(
        { success: false, message: "status must be approved or rejected" },
        400,
      );
    const release = await c.env.DB.prepare(
      "SELECT * FROM payment_releases WHERE id=?",
    )
      .bind(c.req.param("id"))
      .first<Record<string, unknown>>();
    if (!release)
      return c.json({ success: false, message: "Release not found" }, 404);
    if (release.status !== "pending")
      return c.json(
        { success: false, message: "Release already processed" },
        400,
      );
    const fee = Number(b.fee_usd || release.fee_usd || 30);
    const rate = Number(b.exchange_rate || 275.62);
    const received =
      b.status === "approved"
        ? (Number(release.amount_usd) - fee) * rate
        : null;
    const statements = [
      c.env.DB.prepare(
        "UPDATE payment_releases SET status=?,exchange_rate=?,fee_usd=?,received_pkr=?,screenshot_url=?,rejection_reason=?,released_at=CURRENT_TIMESTAMP,released_by=? WHERE id=?",
      ).bind(
        b.status,
        rate,
        fee,
        received,
        b.screenshot_url || null,
        b.rejection_reason || null,
        c.get("employee")!.id,
        c.req.param("id"),
      ),
    ];
    if (b.status === "approved")
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','Release approved',?,'/finance')",
        ).bind(
          `Release of $${Number(release.amount_usd)} approved @ ${rate} → ₨${Number(received).toLocaleString()}`,
        ),
      );
    await c.env.DB.batch(statements);
    return c.json({ success: true, received_pkr: received });
  },
);

app.post("/failed", async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  if (!b.name || !b.email)
    return c.json({ success: false, message: "name and email required" }, 400);
  const plan = ["startup", "business", "enterprise"].includes(
    String(b.plan).toLowerCase(),
  )
    ? String(b.plan).toLowerCase()
    : "startup";
  const billing = ["weekly", "monthly"].includes(
    String(b.billing).toLowerCase(),
  )
    ? String(b.billing).toLowerCase()
    : "monthly";
  await c.env.DB.prepare(
    "INSERT INTO payments (name,email,company,plan,billing,amount,whitelabel,payment_ref,txn_id,referral_code,status) VALUES (?,?,?,?,?,?,?,?,?,?,'failed')",
  )
    .bind(
      b.name,
      b.email,
      b.company || null,
      plan,
      billing,
      Number(b.total) || 0,
      b.hasWhitelabel ? 1 : 0,
      b.paymentRef || null,
      b.txnId || null,
      b.referralCode || null,
    )
    .run();
  return c.json({ success: true, message: "Failed payment saved" });
});

app.get(
  "/subscription-changes",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    await sweepChanges(c.env.DB);
    const [changes, tickets] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT sc.*,c.name AS client_name,c.email AS client_email,c.company FROM subscription_changes sc JOIN clients c ON c.id=sc.client_id WHERE sc.status IN ('awaiting_payment','payment_reported','partially_paid','scheduled') ORDER BY CASE sc.status WHEN 'payment_reported' THEN 1 WHEN 'partially_paid' THEN 2 WHEN 'awaiting_payment' THEN 3 ELSE 4 END,sc.requested_at`,
      ),
      c.env.DB.prepare(
        "SELECT t.*,c.name AS client_name,c.company,c.email AS client_email FROM client_tickets t JOIN clients c ON c.id=t.client_id WHERE t.category='Billing Question' AND t.status IN ('Open','In Progress') ORDER BY t.created_at",
      ),
    ]);
    return c.json({
      success: true,
      changes: changes?.results ?? [],
      billing_tickets: tickets?.results ?? [],
    });
  },
);
app.patch(
  "/billing-tickets/:id",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const b = await c.req.json<{ status: string }>();
    if (!["Open", "In Progress", "Resolved", "Closed"].includes(b.status))
      return c.json({ success: false, message: "Invalid ticket status" }, 400);
    await c.env.DB.prepare(
      "UPDATE client_tickets SET status=? WHERE id=? AND category='Billing Question'",
    )
      .bind(b.status, c.req.param("id"))
      .run();
    return c.json({ success: true });
  },
);
app.post(
  "/subscription-changes/:id/verify",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const b: { amount_received?: number } = await c.req
      .json<{ amount_received?: number }>()
      .catch(() => ({}));
    const change = await c.env.DB.prepare(
      "SELECT * FROM subscription_changes WHERE id=?",
    )
      .bind(c.req.param("id"))
      .first<SubscriptionChange>();
    if (!change)
      return c.json({ success: false, message: "Change not found" }, 404);
    if (change.status === "active")
      return c.json({ success: false, message: "Already applied" }, 409);
    const due = Number(change.amount_due);
    const received =
      b.amount_received === undefined ? due : Number(b.amount_received);
    if (received + 0.01 < due) {
      await c.env.DB.prepare(
        "UPDATE subscription_changes SET amount_received=?,status='partially_paid' WHERE id=?",
      )
        .bind(received, change.id)
        .run();
      return c.json({
        success: true,
        applied: false,
        shortfall: Math.round((due - received) * 100) / 100,
      });
    }
    await applyChange(c.env.DB, change);
    await c.env.DB.prepare(
      "UPDATE subscription_changes SET amount_received=?,status='active',verified_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(received, change.id)
      .run();
    const result = await c.env.DB.prepare(
      "INSERT INTO payments (client_id,name,email,company,plan,billing,amount,status,payment_ref,submitted_at,confirmed_at) SELECT c.id,c.name,c.email,c.company,c.plan,c.billing,?,'confirmed',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM clients c WHERE c.id=?",
    )
      .bind(received, change.payment_ref, change.client_id)
      .run();
    const payment = await c.env.DB.prepare(
      "SELECT id,plan,billing,payment_ref FROM payments WHERE id=?",
    )
      .bind(result.meta.last_row_id)
      .first<{
        id: number;
        plan: string;
        billing: string;
        payment_ref: string;
      }>();
    if (payment)
      await c.env.DB.prepare(
        "INSERT INTO client_messages (client_id,sender,content) VALUES (?,'team',?)",
      )
        .bind(change.client_id, invoiceBody({ ...payment, amount: received }))
        .run();
    return c.json({ success: true, applied: true });
  },
);
app.post(
  "/subscription-changes/:id/reject",
  requireEmployee,
  requireRoles(...FINANCE_ACCESS),
  async (c) => {
    const b: { reason?: string } = await c.req
      .json<{ reason?: string }>()
      .catch(() => ({}));
    await c.env.DB.prepare(
      "UPDATE subscription_changes SET status='rejected',notes=COALESCE(?,notes) WHERE id=?",
    )
      .bind(b.reason || null, c.req.param("id"))
      .run();
    return c.json({ success: true });
  },
);

export default app;
