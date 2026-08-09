import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee, requireRoles } from "../middleware/auth";
import { parseJson } from "../lib/db";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const DAYS = { weekly: 7, monthly: 30 } as const;
const AMOUNTS = { startup: 870, business: 1550, enterprise: 7820 } as const;
type Client = {
  id: number;
  plan: keyof typeof AMOUNTS;
  billing: keyof typeof DAYS;
  subscribed_at: string;
  next_payment_due: string | null;
};
type Payment = { received_usd: number; confirmed_at: string };
const score = (
  onTime: number,
  streak: number,
  projects: number,
  requests: number,
  billingDays: number,
  daysSince: number,
) =>
  Math.round(
    Math.max(
      0,
      Math.min(
        100,
        50 +
          onTime * 30 +
          Math.min(streak, 6) * 3 +
          (projects ? 8 : 0) +
          (requests ? 4 : 0) -
          (daysSince > billingDays * 1.5 ? 20 : 0),
      ),
    ),
  );
export async function runPredictionEngine(db: D1Database) {
  const started = Date.now();
  let clientsScored = 0,
    predictionsCreated = 0,
    predictionsUpdated = 0;
  try {
    const clients = (
      await db
        .prepare(
          "SELECT id,plan,billing,subscribed_at,next_payment_due FROM clients WHERE status='active'",
        )
        .all<Client>()
    ).results;
    for (const client of clients) {
      const cadence = client.billing || "monthly";
      const billingDays = DAYS[cadence] || 30;
      const base = AMOUNTS[client.plan] || 500;
      const payments = (
        await db
          .prepare(
            "SELECT COALESCE(received_usd,amount) AS received_usd,confirmed_at FROM payments WHERE email=(SELECT email FROM clients WHERE id=?) AND status='confirmed' ORDER BY confirmed_at DESC LIMIT 12",
          )
          .bind(client.id)
          .all<Payment>()
      ).results;
      const [projectsResult, requestsResult] = await db.batch([
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM projects WHERE client_id=? AND status='active'",
          )
          .bind(client.id),
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM requests WHERE client_id=? AND status NOT IN ('completed','cancelled') AND request_kind!='parent'",
          )
          .bind(client.id),
      ]);
      const projects = Number(
          (projectsResult?.results?.[0] as Record<string, unknown> | undefined)
            ?.n || 0,
        ),
        requests = Number(
          (requestsResult?.results?.[0] as Record<string, unknown> | undefined)
            ?.n || 0,
        );
      const lastDate = new Date(
        payments[0]?.confirmed_at || client.subscribed_at,
      );
      const daysSince = Math.floor(
        (Date.now() - lastDate.getTime()) / 86_400_000,
      );
      const recent = payments.slice(0, 6);
      const average = recent.length
        ? recent.reduce((sum, p) => sum + Number(p.received_usd || 0), 0) /
          recent.length
        : base;
      let onTimeCount = 0,
        streak = 0;
      for (let i = 0; i < payments.length - 1; i += 1) {
        const current = payments[i];
        const previous = payments[i + 1];
        if (!current || !previous) continue;
        const gap =
          (new Date(current.confirmed_at).getTime() -
            new Date(previous.confirmed_at).getTime()) /
          86_400_000;
        const onTime = Math.abs(gap - billingDays) <= 5;
        if (onTime) onTimeCount += 1;
        if (i === streak && onTime) streak += 1;
      }
      const onTimeRate =
        payments.length > 1 ? onTimeCount / (payments.length - 1) : 0.5;
      const predicted = client.next_payment_due
        ? new Date(client.next_payment_due)
        : new Date(lastDate.getTime() + billingDays * 86_400_000);
      if ((predicted.getTime() - Date.now()) / 86_400_000 < -(billingDays * 2))
        continue;
      const date = predicted.toISOString().slice(0, 10);
      const signals = {
        on_time_rate: Math.round(onTimeRate * 100) / 100,
        streak,
        avg_amount: Math.round(average * 100) / 100,
        active_projects: projects,
        active_requests: requests,
        billing: cadence,
        billing_days: billingDays,
        days_since_last: daysSince,
        payments_history_count: payments.length,
      };
      const confidence = score(
        onTimeRate,
        streak,
        projects,
        requests,
        billingDays,
        daysSince,
      );
      const scope = confidence >= 80 ? "both" : "monthly";
      const nearby = (
        await db
          .prepare(
            "SELECT id FROM payment_predictions WHERE client_id=? AND status='pending' AND ABS(julianday(predicted_date)-julianday(?))<=7 ORDER BY updated_at DESC",
          )
          .bind(client.id, date)
          .all<{ id: number }>()
      ).results;
      for (const duplicate of nearby.slice(1))
        await db
          .prepare("DELETE FROM payment_predictions WHERE id=?")
          .bind(duplicate.id)
          .run();
      if (nearby[0]) {
        await db
          .prepare(
            "UPDATE payment_predictions SET predicted_amount=?,predicted_date=?,confidence=?,signals=?,view_scope=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
          )
          .bind(
            average,
            date,
            confidence,
            JSON.stringify(signals),
            scope,
            nearby[0].id,
          )
          .run();
        predictionsUpdated += 1;
      } else {
        await db
          .prepare(
            "INSERT INTO payment_predictions (client_id,predicted_amount,predicted_date,confidence,signals,view_scope) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            client.id,
            average,
            date,
            confidence,
            JSON.stringify(signals),
            scope,
          )
          .run();
        predictionsCreated += 1;
      }
      clientsScored += 1;
    }
    const pending = (
      await db
        .prepare(
          "SELECT pp.id,pp.predicted_date,c.email AS client_email FROM payment_predictions pp JOIN clients c ON c.id=pp.client_id WHERE pp.status='pending' AND date(pp.predicted_date)<date('now')",
        )
        .all<{ id: number; predicted_date: string; client_email: string }>()
    ).results;
    for (const prediction of pending) {
      const match = await db
        .prepare(
          "SELECT id FROM payments WHERE email=? AND status='confirmed' AND ABS(julianday(confirmed_at)-julianday(?))<=3 LIMIT 1",
        )
        .bind(prediction.client_email, prediction.predicted_date)
        .first<{ id: number }>();
      if (match)
        await db
          .prepare(
            "UPDATE payment_predictions SET status='confirmed',outcome_payment_id=?,outcome_at=CURRENT_TIMESTAMP WHERE id=?",
          )
          .bind(match.id, prediction.id)
          .run();
      else if (
        (Date.now() - new Date(prediction.predicted_date).getTime()) /
          86_400_000 >
        3
      )
        await db
          .prepare(
            "UPDATE payment_predictions SET status='missed',outcome_at=CURRENT_TIMESTAMP WHERE id=?",
          )
          .bind(prediction.id)
          .run();
    }
    const duration = Date.now() - started;
    await db
      .prepare(
        "INSERT INTO prediction_runs (clients_scored,predictions_created,predictions_updated,duration_ms) VALUES (?,?,?,?)",
      )
      .bind(clientsScored, predictionsCreated, predictionsUpdated, duration)
      .run();
    return { clientsScored, predictionsCreated, predictionsUpdated, duration };
  } catch (error) {
    await db
      .prepare(
        "INSERT INTO prediction_runs (clients_scored,predictions_created,predictions_updated,duration_ms,error) VALUES (?,?,?,?,?)",
      )
      .bind(
        clientsScored,
        predictionsCreated,
        predictionsUpdated,
        Date.now() - started,
        error instanceof Error ? error.message : String(error),
      )
      .run()
      .catch(() => undefined);
    throw error;
  }
}
app.post("/run", requireEmployee, requireRoles("owner", "admin"), async (c) => {
  try {
    return c.json({ success: true, ...(await runPredictionEngine(c.env.DB)) });
  } catch (error) {
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
app.get("/", requireEmployee, requireRoles("owner", "admin"), async (c) => {
  const scope = c.req.query("scope") || "all";
  const year = Number(c.req.query("year") || new Date().getFullYear());
  const filter =
    scope === "yearly"
      ? "AND pp.view_scope IN ('both','yearly')"
      : scope === "monthly"
        ? "AND pp.view_scope IN ('both','monthly')"
        : "";
  const predictions = (
    await c.env.DB.prepare(
      `SELECT pp.id,pp.client_id,c.name AS client_name,c.company AS client_company,pp.predicted_amount,pp.predicted_date,pp.confidence,pp.status,pp.view_scope,pp.signals,pp.outcome_at FROM payment_predictions pp JOIN clients c ON c.id=pp.client_id WHERE CAST(strftime('%Y',pp.predicted_date) AS INTEGER)=? ${filter} ORDER BY pp.predicted_date`,
    )
      .bind(year)
      .all()
  ).results.map((row) => ({
    ...row,
    signals: parseJson(row.signals, {}),
    predicted_amount: Number(row.predicted_amount),
  }));
  const last = await c.env.DB.prepare(
    "SELECT ran_at FROM prediction_runs ORDER BY ran_at DESC LIMIT 1",
  ).first<{ ran_at: string }>();
  return c.json({ success: true, predictions, last_run: last?.ran_at || null });
});
export default app;
