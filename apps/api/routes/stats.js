import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM clients WHERE status = 'active') AS active_clients,
        (SELECT COUNT(*) FROM requests WHERE status != 'completed' AND request_kind != 'parent') AS active_requests,
        (SELECT COUNT(*) FROM requests WHERE status = 'in_review' AND request_kind != 'parent') AS in_review,
        (SELECT COUNT(*) FROM employees WHERE status = 'active') AS team_members,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending_payments,
        ((SELECT COUNT(*) FROM job_applications) + (SELECT COUNT(*) FROM internship_applications)) AS open_applications,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'confirmed' AND MONTH(confirmed_at)=MONTH(CURDATE()) AND YEAR(confirmed_at)=YEAR(CURDATE())) AS monthly_revenue,
        (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE MONTH(date)=MONTH(CURDATE()) AND YEAR(date)=YEAR(CURDATE())) AS monthly_expenses,
        (SELECT COUNT(*) FROM bookings WHERE booking_date >= CURDATE() AND status = 'confirmed') AS upcoming_bookings,
        (SELECT COUNT(*) FROM clients WHERE status = 'active' AND subscribed_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')) AS prev_clients,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'confirmed' AND MONTH(confirmed_at)=MONTH(CURDATE()-INTERVAL 1 MONTH) AND YEAR(confirmed_at)=YEAR(CURDATE()-INTERVAL 1 MONTH)) AS prev_revenue,
        (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE MONTH(date)=MONTH(CURDATE()-INTERVAL 1 MONTH) AND YEAR(date)=YEAR(CURDATE()-INTERVAL 1 MONTH)) AS prev_expenses,
        (SELECT COUNT(*) FROM requests WHERE status != 'completed' AND request_kind != 'parent' AND created_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')) AS prev_requests,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending' AND submitted_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')) AS prev_pending_payments,
        (SELECT COUNT(*) FROM dashboard_alerts WHERE is_read = 0) AS unread_alerts,
        (SELECT COALESCE(SUM(received_pkr),0) FROM payments WHERE status = 'confirmed') AS lifetime_revenue_pkr,
        (SELECT COALESCE(SUM(CASE WHEN currency='PKR' THEN amount ELSE amount * COALESCE(284.5,1) END),0) FROM expenses) AS lifetime_expenses_pkr,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','pending') AND booking_date >= CURDATE()) AS active_proposals,
        (SELECT COALESCE(SUM(salary),0) FROM employees WHERE status = 'active') AS monthly_payroll_pkr,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending_approvals,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'pending') AS outstanding_invoices_total
    `);

    const [alerts] = await db.execute(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM dashboard_alerts ORDER BY created_at DESC LIMIT 10`
    );

    const [recent_clients] = await db.execute(
      `SELECT id, name, email, company, plan, billing, status, subscribed_at
       FROM clients ORDER BY subscribed_at DESC LIMIT 5`
    );

    const [recent_requests] = await db.execute(
      `SELECT r.id, r.title, r.status, r.priority, r.type, r.due_date,
              c.name AS client_name, e.name AS assigned_to
       FROM requests r
       LEFT JOIN clients c ON c.id = r.client_id
       LEFT JOIN employees e ON e.id = r.assigned_to
       WHERE r.request_kind != 'parent'
       ORDER BY r.created_at DESC LIMIT 10`
    );

    const lifetimeRevPkr = Number(stats.lifetime_revenue_pkr || 0);
    const lifetimeExpPkr = Number(stats.lifetime_expenses_pkr || 0);
    stats.pkr_balance = lifetimeRevPkr - lifetimeExpPkr;
    stats.pipeline_value = Number(stats.active_proposals || 0) * 1500 * 284.5;
    const now = new Date();
    const nextPayroll = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    stats.next_payroll_date = nextPayroll.toISOString().slice(0, 10);
    stats.next_payroll_amount = stats.monthly_payroll_pkr;

    return res.json({ success: true, stats, alerts, recent_clients, recent_requests });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/stats/top-source?year=YYYY[&month=M] — top revenue source for the period
router.get('/top-source', authenticate, async (req, res) => {
  try {
    const year  = parseInt(req.query.year || new Date().getFullYear(), 10);
    const monthRaw = req.query.month;
    const where = monthRaw
      ? `status='confirmed' AND YEAR(confirmed_at)=? AND MONTH(confirmed_at)=?`
      : `status='confirmed' AND YEAR(confirmed_at)=?`;
    const params = monthRaw ? [year, parseInt(monthRaw, 10)] : [year];

    const [rows] = await db.execute(
      `SELECT COALESCE(NULLIF(company,''), NULLIF(name,''), 'Unknown') AS source,
              SUM(amount) AS total
       FROM payments
       WHERE ${where}
       GROUP BY source
       ORDER BY total DESC
       LIMIT 5`,
      params
    );
    if (!rows.length) return res.json({ success: true, top: null });
    const totalAll = rows.reduce((s, r) => s + Number(r.total), 0);
    const top = rows[0];
    return res.json({
      success: true,
      top: {
        name: top.source,
        amount: Number(top.total),
        share: totalAll > 0 ? (Number(top.total) / totalAll) * 100 : 0,
      },
    });
  } catch (err) {
    console.error('top-source error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/stats/chart?year=YYYY&month=M — daily revenue + categorised expenses for MoneyCard
router.get('/chart', authenticate, async (req, res) => {
  try {
    const year  = parseInt(req.query.year  || new Date().getFullYear(),  10);
    const month = parseInt(req.query.month || new Date().getMonth() + 1, 10);

    // Daily confirmed payments (USD) for the requested month
    const [payments] = await db.execute(
      `SELECT DATE(confirmed_at) AS date,
              COALESCE(SUM(amount), 0) AS revenue
       FROM payments
       WHERE status = 'confirmed'
         AND YEAR(confirmed_at) = ? AND MONTH(confirmed_at) = ?
       GROUP BY DATE(confirmed_at)
       ORDER BY date ASC`,
      [year, month]
    );

    // Daily expenses for the same month — each row is one expense entry
    // USD expenses are converted to PKR using the exchange_rate from that day's payments,
    // falling back to 284.50 (current rate) so the chart always shows a PKR value.
    const [expenses] = await db.execute(
      `SELECT
         e.id,
         e.date,
         e.category,
         e.description,
         e.amount,
         e.currency,
         CASE
           WHEN e.currency = 'PKR' THEN e.amount
           ELSE e.amount * COALESCE(
             (SELECT AVG(p.exchange_rate)
              FROM payments p
              WHERE p.status = 'confirmed'
                AND DATE(p.confirmed_at) <= e.date
                AND p.exchange_rate IS NOT NULL
              LIMIT 1),
             284.50
           )
         END AS expense_pkr
       FROM expenses e
       WHERE YEAR(e.date) = ? AND MONTH(e.date) = ?
       ORDER BY e.date ASC`,
      [year, month]
    );

    // Shape: revenue rows get type 'revenue', expense rows get type 'expense'
    const series = [
      ...payments.map(p => ({
        date:    p.date,
        type:    'revenue',
        revenue: Number(p.revenue),
      })),
      ...expenses.map(e => ({
        date:        e.date,
        type:        'expense',
        expense_pkr: Number(e.expense_pkr),
        description: e.description,
        category:    e.category,
        amount:      Number(e.amount),
        currency:    e.currency,
      })),
    ];

    return res.json({ success: true, series });
  } catch (err) {
    console.error('Stats chart error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
