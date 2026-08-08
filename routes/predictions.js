import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

const OWNER_ADMIN = ['owner', 'admin'];
const BILLING_DAYS = { weekly: 7, monthly: 30 };
const PLAN_AMOUNTS = { startup: 870, business: 1550, enterprise: 7820 };

// ─── CONFIDENCE SCORING ────────────────────────────────────────────────────────

function scoreClient({ onTimeRate, streak, activeProjets, activeRequests, billingDays, daysSinceLast }) {
  let score = 50;
  score += onTimeRate * 30;                                          // max +30
  score += Math.min(streak, 6) * 3;                                 // max +18
  score += activeProjets > 0 ? 8 : 0;                               // +8
  score += activeRequests > 0 ? 4 : 0;                              // +4
  if (daysSinceLast > billingDays * 1.5) score -= 20;               // overdue penalty
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── PREDICTION ENGINE ─────────────────────────────────────────────────────────

async function runEngine() {
  const startMs = Date.now();
  let clientsScored = 0;
  let predictionsCreated = 0;
  let predictionsUpdated = 0;

  try {
    // 1. Fetch all active clients
    const [clients] = await db.execute(
      `SELECT id, name, plan, billing, subscribed_at, next_payment_due FROM clients WHERE status = 'active'`
    );

    for (const client of clients) {
      const billingCadence = client.billing || 'monthly';
      const billingDays = BILLING_DAYS[billingCadence] || 30;
      const baseAmount = PLAN_AMOUNTS[client.plan] || 500;

      // Payment history — use amount as fallback when received_usd is null
      const [payments] = await db.execute(
        `SELECT COALESCE(received_usd, amount) AS received_usd, confirmed_at FROM payments
         WHERE email = (SELECT email FROM clients WHERE id = ?)
           AND status = 'confirmed'
         ORDER BY confirmed_at DESC LIMIT 12`,
        [client.id]
      );

      // Active projects
      const [[{ activeProjects }]] = await db.execute(
        `SELECT COUNT(*) AS activeProjects FROM projects WHERE client_id = ? AND status = 'active'`,
        [client.id]
      );

      // Active requests
      const [[{ activeRequests }]] = await db.execute(
        `SELECT COUNT(*) AS activeRequests FROM requests
         WHERE client_id = ? AND status NOT IN ('completed','cancelled') AND request_kind != 'parent'`,
        [client.id]
      );

      // Last confirmed payment date
      const lastPayment = payments[0];
      const lastDate = lastPayment ? new Date(lastPayment.confirmed_at) : new Date(client.subscribed_at);
      const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

      // Average amount from last 6 payments
      const recent = payments.slice(0, 6);
      const avgAmount = recent.length
        ? recent.reduce((sum, p) => sum + Number(p.received_usd || 0), 0) / recent.length
        : baseAmount;

      // On-time rate: payment arrived within 5 days of expected due date
      let onTime = 0;
      for (let i = 0; i < payments.length - 1; i++) {
        const curr = new Date(payments[i].confirmed_at);
        const prev = new Date(payments[i + 1].confirmed_at);
        const actualGap = (curr - prev) / 86400000;
        if (Math.abs(actualGap - billingDays) <= 5) onTime++;
      }
      const onTimeRate = payments.length > 1 ? onTime / (payments.length - 1) : 0.5;

      // Streak: consecutive on-time payments
      let streak = 0;
      for (let i = 0; i < payments.length - 1; i++) {
        const curr = new Date(payments[i].confirmed_at);
        const prev = new Date(payments[i + 1].confirmed_at);
        const gap = (curr - prev) / 86400000;
        if (Math.abs(gap - billingDays) <= 5) streak++;
        else break;
      }

      // Predicted date
      let predictedDate;
      if (client.next_payment_due) {
        predictedDate = new Date(client.next_payment_due);
      } else {
        predictedDate = new Date(lastDate);
        predictedDate.setDate(predictedDate.getDate() + billingDays);
      }

      // Skip if predicted date is more than 2 cycles in the past (stale)
      const daysUntilDue = (predictedDate - Date.now()) / 86400000;
      if (daysUntilDue < -(billingDays * 2)) continue;

      const signals = {
        on_time_rate: Math.round(onTimeRate * 100) / 100,
        streak,
        avg_amount: Math.round(avgAmount * 100) / 100,
        active_projects: activeProjects,
        active_requests: activeRequests,
        billing: billingCadence,
        billing_days: billingDays,
        days_since_last: daysSinceLast,
        payments_history_count: payments.length,
      };

      const confidence = scoreClient({
        onTimeRate,
        streak,
        activeProjets: activeProjects,
        activeRequests,
        billingDays,
        daysSinceLast,
      });

      const viewScope = confidence >= 80 ? 'both' : 'monthly';
      const predictedDateStr = predictedDate.toISOString().slice(0, 10);

      // Deduplicate: remove extra pending predictions for this client within ±7 days, keep only the latest
      await db.execute(
        `DELETE FROM payment_predictions
         WHERE client_id = ? AND status = 'pending'
           AND ABS(DATEDIFF(predicted_date, ?)) <= 7
           AND id NOT IN (
             SELECT id FROM (
               SELECT id FROM payment_predictions
               WHERE client_id = ? AND status = 'pending'
                 AND ABS(DATEDIFF(predicted_date, ?)) <= 7
               ORDER BY updated_at DESC LIMIT 1
             ) AS keep
           )`,
        [client.id, predictedDateStr, client.id, predictedDateStr]
      );

      // Upsert: check if pending prediction exists within ±7 days
      const [[existing]] = await db.execute(
        `SELECT id FROM payment_predictions
         WHERE client_id = ? AND status = 'pending'
           AND ABS(DATEDIFF(predicted_date, ?)) <= 7
         LIMIT 1`,
        [client.id, predictedDateStr]
      );

      if (existing) {
        await db.execute(
          `UPDATE payment_predictions
           SET predicted_amount = ?, predicted_date = ?, confidence = ?,
               signals = ?, view_scope = ?, updated_at = NOW()
           WHERE id = ?`,
          [avgAmount, predictedDateStr, confidence, JSON.stringify(signals), viewScope, existing.id]
        );
        predictionsUpdated++;
      } else {
        await db.execute(
          `INSERT INTO payment_predictions
             (client_id, predicted_amount, predicted_date, confidence, signals, view_scope)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [client.id, avgAmount, predictedDateStr, confidence, JSON.stringify(signals), viewScope]
        );
        predictionsCreated++;
      }

      clientsScored++;
    }

    // 2. Resolve outcomes for pending predictions whose date has passed
    const [pending] = await db.execute(
      `SELECT pp.id, pp.client_id, pp.predicted_date,
              c.email AS client_email
       FROM payment_predictions pp
       JOIN clients c ON c.id = pp.client_id
       WHERE pp.status = 'pending' AND pp.predicted_date < CURDATE()`
    );

    for (const pred of pending) {
      // Check if a real payment arrived within ±3 days
      const [[match]] = await db.execute(
        `SELECT id FROM payments
         WHERE email = ? AND status = 'confirmed'
           AND ABS(DATEDIFF(confirmed_at, ?)) <= 3
         LIMIT 1`,
        [pred.client_email, pred.predicted_date]
      );

      if (match) {
        await db.execute(
          `UPDATE payment_predictions
           SET status = 'confirmed', outcome_payment_id = ?, outcome_at = NOW()
           WHERE id = ?`,
          [match.id, pred.id]
        );
      } else {
        // Only mark missed if > 3 days past due
        const daysPast = Math.floor((Date.now() - new Date(pred.predicted_date)) / 86400000);
        if (daysPast > 3) {
          await db.execute(
            `UPDATE payment_predictions SET status = 'missed', outcome_at = NOW() WHERE id = ?`,
            [pred.id]
          );
        }
      }
    }

    const duration = Date.now() - startMs;
    await db.execute(
      `INSERT INTO prediction_runs (clients_scored, predictions_created, predictions_updated, duration_ms)
       VALUES (?, ?, ?, ?)`,
      [clientsScored, predictionsCreated, predictionsUpdated, duration]
    );

    return { clientsScored, predictionsCreated, predictionsUpdated, duration };
  } catch (err) {
    await db.execute(
      `INSERT INTO prediction_runs (clients_scored, predictions_created, predictions_updated, duration_ms, error)
       VALUES (?, ?, ?, ?, ?)`,
      [clientsScored, predictionsCreated, predictionsUpdated, Date.now() - startMs, err.message]
    ).catch(() => {});
    throw err;
  }
}

// ─── SCHEDULED AUTO-RUN (every 6 hours) ───────────────────────────────────────

const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => {
  runEngine().catch(err => console.error('[predictions] scheduled run failed:', err.message));
}, SIX_HOURS);

// Run once on startup (after 10s delay to let DB connections settle)
setTimeout(() => {
  runEngine().catch(err => console.error('[predictions] startup run failed:', err.message));
}, 10_000);

// ─── ROUTES ────────────────────────────────────────────────────────────────────

// POST /api/predictions/run — manually trigger engine (owner/admin only)
router.post('/run', authenticate, requireRoles(OWNER_ADMIN), async (req, res) => {
  try {
    const result = await runEngine();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[predictions] manual run failed:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/predictions — fetch predictions for dashboard
router.get('/', authenticate, requireRoles(OWNER_ADMIN), async (req, res) => {
  try {
    const { scope = 'all', year = new Date().getFullYear() } = req.query;

    let scopeFilter = '';
    if (scope === 'yearly') scopeFilter = `AND pp.view_scope IN ('both', 'yearly')`;
    else if (scope === 'monthly') scopeFilter = `AND pp.view_scope IN ('both', 'monthly')`;

    const [predictions] = await db.execute(
      `SELECT pp.id, pp.client_id, c.name AS client_name, c.company AS client_company,
              pp.predicted_amount, pp.predicted_date, pp.confidence,
              pp.status, pp.view_scope, pp.signals, pp.outcome_at
       FROM payment_predictions pp
       JOIN clients c ON c.id = pp.client_id
       WHERE YEAR(pp.predicted_date) = ? ${scopeFilter}
       ORDER BY pp.predicted_date ASC`,
      [year]
    );

    const [[lastRun]] = await db.execute(
      `SELECT ran_at FROM prediction_runs ORDER BY ran_at DESC LIMIT 1`
    );

    return res.json({
      success: true,
      predictions: predictions.map(p => ({
        ...p,
        signals: typeof p.signals === 'string' ? JSON.parse(p.signals) : p.signals,
        predicted_amount: Number(p.predicted_amount),
      })),
      last_run: lastRun?.ran_at || null,
    });
  } catch (err) {
    console.error('[predictions] fetch failed:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
