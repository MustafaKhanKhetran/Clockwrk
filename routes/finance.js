import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { applyChange, sweepChanges } from '../services/billingChanges.js';

const router = Router();
const FINANCE_ACCESS = ['owner', 'admin', 'finance'];

router.get('/', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT id, name, email, company, plan, billing, amount, fee_usd, received_usd, exchange_rate, received_pkr,
              whitelabel, txn_id, payment_ref, referral_code, status, submitted_at, confirmed_at
       FROM payments ORDER BY submitted_at DESC`
    );
    const [expenses] = await db.execute(
      `SELECT id, category, description, amount, currency, date, notes, created_at FROM expenses ORDER BY date DESC`
    );
    const [employees] = await db.execute(
      `SELECT id, name, email, role, salary, department, status FROM employees WHERE status = 'active' ORDER BY name ASC`
    );
    const [revenue_chart] = await db.execute(
      `SELECT DATE_FORMAT(confirmed_at,'%Y-%m') AS month,
              COALESCE(SUM(amount),0) AS revenue_usd,
              COALESCE(SUM(received_pkr),0) AS revenue_pkr,
              COALESCE(AVG(exchange_rate),275.62) AS avg_rate
       FROM payments WHERE status = 'confirmed' AND confirmed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );
    const [releases] = await db.execute(
      `SELECT pr.*, e.name AS requester_name, e.email AS requester_email, e.role AS requester_role,
              rel.name AS releaser_name
       FROM payment_releases pr
       LEFT JOIN employees e ON e.id = pr.requested_by
       LEFT JOIN employees rel ON rel.id = pr.released_by
       ORDER BY pr.requested_at DESC`
    );
    return res.json({ success: true, payments, expenses, employees, revenue_chart, releases });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Confirm payment
router.post('/payments/:id/confirm', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  const { exchange_rate, fee_usd } = req.body;
  const { id } = req.params;
  try {
    const [[payment]] = await db.execute('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    const fee = fee_usd || 30;
    const received_usd = payment.amount - fee;
    const received_pkr = received_usd * (exchange_rate || 275.62);
    await db.execute(
      `UPDATE payments SET status = 'confirmed', confirmed_at = NOW(), fee_usd = ?, received_usd = ?, exchange_rate = ?, received_pkr = ? WHERE id = ?`,
      [fee, received_usd, exchange_rate || 275.62, received_pkr, id]
    );
    // Create client if not exists
    const [[existing]] = await db.execute('SELECT id FROM clients WHERE email = ?', [payment.email]);
    if (!existing) {
      const [clientResult] = await db.execute(
        `INSERT INTO clients (name, email, company, plan, billing, whitelabel, status, payment_ref, referral_code, subscribed_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW())`,
        [payment.name, payment.email, payment.company, payment.plan, payment.billing, payment.whitelabel, payment.payment_ref, payment.referral_code || '']
      );
      await db.execute(
        `INSERT INTO projects (client_id, name, status) VALUES (?, ?, 'active')`,
        [clientResult.insertId, `${payment.company || payment.name} Project`]
      );
    }
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'Payment confirmed', ?, '/finance')`,
      [`${payment.name} — $${payment.amount} confirmed`]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Expenses
router.post('/expenses', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  const { category, description, amount, currency, date, notes } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO expenses (category, description, amount, currency, date, added_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, description, amount, currency || 'PKR', date, req.user.id, notes || '']
    );
    const [[expense]] = await db.execute('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
    return res.json({ success: true, expense });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/expenses/:id', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  const { category, description, amount, currency, date, notes } = req.body;
  try {
    await db.execute(
      `UPDATE expenses SET category = ?, description = ?, amount = ?, currency = ?, date = ?, notes = ? WHERE id = ?`,
      [category, description, amount, currency || 'PKR', date, notes || '', req.params.id]
    );
    const [[expense]] = await db.execute('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    return res.json({ success: true, expense });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/expenses/:id', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    await db.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── ElevatePay Release Requests ─────────────────────────────────────────────

// Any authenticated employee can request a release
router.post('/releases', authenticate, async (req, res) => {
  const { amount_usd, fee_usd, notes } = req.body;
  if (!amount_usd || isNaN(parseFloat(amount_usd)) || parseFloat(amount_usd) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount_usd is required' });
  }
  try {
    const [result] = await db.execute(
      `INSERT INTO payment_releases (requested_by, amount_usd, fee_usd, notes) VALUES (?, ?, ?, ?)`,
      [req.user.id, parseFloat(amount_usd), parseFloat(fee_usd || 30), notes || null]
    );
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('finance', 'Release requested', ?, '/finance')`,
      [`${req.user.name || req.user.email} requested $${amount_usd} release from ElevatePay`]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Owner approves or rejects a release
router.patch('/releases/:id', authenticate, requireRoles(['owner', 'admin']), async (req, res) => {
  const { status, exchange_rate, fee_usd, screenshot_url, rejection_reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
  }
  try {
    const [[release]] = await db.execute('SELECT * FROM payment_releases WHERE id = ?', [req.params.id]);
    if (!release) return res.status(404).json({ success: false, message: 'Release not found' });
    if (release.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Release already processed' });
    }

    let received_pkr = null;
    const effectiveFee = parseFloat(fee_usd || release.fee_usd || 30);
    const effectiveRate = parseFloat(exchange_rate || 275.62);

    if (status === 'approved') {
      const net_usd = parseFloat(release.amount_usd) - effectiveFee;
      received_pkr = net_usd * effectiveRate;
    }

    await db.execute(
      `UPDATE payment_releases
       SET status = ?, exchange_rate = ?, fee_usd = ?, received_pkr = ?,
           screenshot_url = ?, rejection_reason = ?,
           released_at = NOW(), released_by = ?
       WHERE id = ?`,
      [
        status, effectiveRate, effectiveFee, received_pkr,
        screenshot_url || null, rejection_reason || null,
        req.user.id, req.params.id,
      ]
    );

    if (status === 'approved') {
      await db.execute(
        `INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('finance', 'Release approved', ?, '/finance')`,
        [`Release of $${release.amount_usd} approved @ ${effectiveRate} → ₨${received_pkr?.toLocaleString()}`]
      );
    }

    return res.json({ success: true, received_pkr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUBLIC: receive failed payment from Cloudflare Worker fallback ───────────
// Called by missed-payment-alert Worker when n8n checkout webhook fails
router.post('/failed', async (req, res) => {
  const { name, email, company, plan, billing, total, hasWhitelabel, paymentRef, txnId, referralCode } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'name and email required' });
  }

  // Normalize plan — only accept known enum values
  const validPlans = ['startup', 'business', 'enterprise'];
  const safePlan = validPlans.includes(String(plan || '').toLowerCase()) ? String(plan).toLowerCase() : 'startup';
  const safeBilling = ['weekly', 'monthly'].includes(String(billing || '').toLowerCase()) ? String(billing).toLowerCase() : 'monthly';

  try {
    await db.execute(
      `INSERT INTO payments (name, email, company, plan, billing, amount, whitelabel, payment_ref, txn_id, referral_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed')`,
      [
        name, email, company || null, safePlan, safeBilling,
        parseFloat(total) || 0,
        hasWhitelabel ? 1 : 0,
        paymentRef || null, txnId || null, referralCode || null,
      ]
    );
    return res.json({ success: true, message: 'Failed payment saved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Subscription changes awaiting verification ───────────────────────────────
// A client requests a plan/add-on change in the portal, transfers the money and
// marks it sent. Nothing on their account moves until someone here confirms the
// transfer actually landed.

router.get('/subscription-changes', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    await sweepChanges();
    const [rows] = await db.execute(
      `SELECT sc.*, c.name AS client_name, c.email AS client_email, c.company
         FROM subscription_changes sc
         JOIN clients c ON c.id = sc.client_id
        WHERE sc.status IN ('awaiting_payment','payment_reported','partially_paid','scheduled')
        ORDER BY FIELD(sc.status,'payment_reported','partially_paid','awaiting_payment','scheduled'), sc.requested_at`
    );
    return res.json({ success: true, changes: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/subscription-changes/:id/verify', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  const { amount_received } = req.body;
  try {
    const [[change]] = await db.execute('SELECT * FROM subscription_changes WHERE id = ?', [req.params.id]);
    if (!change) return res.status(404).json({ success: false, message: 'Change not found' });
    if (change.status === 'active') return res.status(409).json({ success: false, message: 'Already applied' });

    const received = amount_received === undefined ? Number(change.amount_due) : Number(amount_received);
    const due = Number(change.amount_due);

    // Short payment: record it and leave the change pending rather than
    // activating capacity that has not been paid for.
    if (received + 0.01 < due) {
      await db.execute(
        "UPDATE subscription_changes SET amount_received = ?, status = 'partially_paid' WHERE id = ?",
        [received, change.id]
      );
      return res.json({ success: true, applied: false, shortfall: Math.round((due - received) * 100) / 100 });
    }

    await applyChange(change);
    await db.execute(
      "UPDATE subscription_changes SET amount_received = ?, status = 'active', verified_at = NOW() WHERE id = ?",
      [received, change.id]
    );

    // Record the money against the client so it shows in their invoice history.
    try {
      await db.execute(
        `INSERT INTO payments (name, email, company, plan, billing, amount, status, payment_ref, submitted_at, confirmed_at)
         SELECT c.name, c.email, c.company, c.plan, c.billing, ?, 'confirmed', ?, NOW(), NOW()
           FROM clients c WHERE c.id = ?`,
        [received, change.payment_ref, change.client_id]
      );
    } catch (payErr) { console.error('payment record failed:', payErr.message); }

    return res.json({ success: true, applied: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/subscription-changes/:id/reject', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    await db.execute("UPDATE subscription_changes SET status = 'rejected', notes = COALESCE(?, notes) WHERE id = ?", [req.body?.reason || null, req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
