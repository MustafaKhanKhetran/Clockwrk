import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee } from "../middleware/auth";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.get("/", requireEmployee, async (c) => {
  const [statsResult, alerts, clients, requests] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM clients WHERE status='active') AS active_clients,(SELECT COUNT(*) FROM requests WHERE status!='completed' AND request_kind!='parent') AS active_requests,(SELECT COUNT(*) FROM requests WHERE status='in_review' AND request_kind!='parent') AS in_review,(SELECT COUNT(*) FROM employees WHERE status='active') AS team_members,(SELECT COUNT(*) FROM payments WHERE status='pending') AS pending_payments,((SELECT COUNT(*) FROM job_applications)+(SELECT COUNT(*) FROM internship_applications)) AS open_applications,(SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='confirmed' AND strftime('%Y-%m',confirmed_at)=strftime('%Y-%m','now')) AS monthly_revenue,(SELECT COALESCE(SUM(amount),0) FROM expenses WHERE strftime('%Y-%m',date)=strftime('%Y-%m','now')) AS monthly_expenses,(SELECT COUNT(*) FROM bookings WHERE date(booking_date)>=date('now') AND status='confirmed') AS upcoming_bookings,(SELECT COUNT(*) FROM clients WHERE status='active' AND datetime(subscribed_at)<datetime('now','start of month')) AS prev_clients,(SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='confirmed' AND strftime('%Y-%m',confirmed_at)=strftime('%Y-%m','now','-1 month')) AS prev_revenue,(SELECT COALESCE(SUM(amount),0) FROM expenses WHERE strftime('%Y-%m',date)=strftime('%Y-%m','now','-1 month')) AS prev_expenses,(SELECT COUNT(*) FROM requests WHERE status!='completed' AND request_kind!='parent' AND datetime(created_at)<datetime('now','start of month')) AS prev_requests,(SELECT COUNT(*) FROM payments WHERE status='pending' AND datetime(submitted_at)<datetime('now','start of month')) AS prev_pending_payments,(SELECT COUNT(*) FROM dashboard_alerts WHERE is_read=0) AS unread_alerts,(SELECT COALESCE(SUM(received_pkr),0) FROM payments WHERE status='confirmed') AS lifetime_revenue_pkr,(SELECT COALESCE(SUM(CASE WHEN currency='PKR' THEN amount ELSE amount*284.5 END),0) FROM expenses) AS lifetime_expenses_pkr,(SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','pending') AND date(booking_date)>=date('now')) AS active_proposals,(SELECT COALESCE(SUM(salary),0) FROM employees WHERE status='active') AS monthly_payroll_pkr,(SELECT COUNT(*) FROM payments WHERE status='pending') AS pending_approvals,(SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='pending') AS outstanding_invoices_total`,
    ),
    c.env.DB.prepare(
      "SELECT id,type,title,message,link,is_read,created_at FROM dashboard_alerts ORDER BY created_at DESC LIMIT 10",
    ),
    c.env.DB.prepare(
      "SELECT id,name,email,company,plan,billing,status,subscribed_at FROM clients ORDER BY subscribed_at DESC LIMIT 5",
    ),
    c.env.DB.prepare(
      "SELECT r.id,r.title,r.status,r.priority,r.type,r.due_date,c.name AS client_name,e.name AS assigned_to FROM requests r LEFT JOIN clients c ON c.id=r.client_id LEFT JOIN employees e ON e.id=r.assigned_to WHERE r.request_kind!='parent' ORDER BY r.created_at DESC LIMIT 10",
    ),
  ]);
  const stats = {
    ...((statsResult?.results?.[0] ?? {}) as Record<string, unknown>),
  };
  stats.pkr_balance =
    Number(stats.lifetime_revenue_pkr || 0) -
    Number(stats.lifetime_expenses_pkr || 0);
  stats.pipeline_value = Number(stats.active_proposals || 0) * 1500 * 284.5;
  const payroll = new Date();
  payroll.setUTCMonth(payroll.getUTCMonth() + 1, 1);
  stats.next_payroll_date = payroll.toISOString().slice(0, 10);
  stats.next_payroll_amount = stats.monthly_payroll_pkr;
  return c.json({
    success: true,
    stats,
    alerts: alerts?.results ?? [],
    recent_clients: clients?.results ?? [],
    recent_requests: requests?.results ?? [],
  });
});
app.get("/top-source", requireEmployee, async (c) => {
  const year = Number(c.req.query("year") || new Date().getFullYear());
  const month = c.req.query("month");
  const sql = `SELECT COALESCE(NULLIF(company,''),NULLIF(name,''),'Unknown') AS source,SUM(amount) AS total FROM payments WHERE status='confirmed' AND CAST(strftime('%Y',confirmed_at) AS INTEGER)=? ${month ? "AND CAST(strftime('%m',confirmed_at) AS INTEGER)=?" : ""} GROUP BY source ORDER BY total DESC LIMIT 5`;
  const rows = (
    await c.env.DB.prepare(sql)
      .bind(...(month ? [year, Number(month)] : [year]))
      .all<{ source: string; total: number }>()
  ).results;
  if (!rows.length) return c.json({ success: true, top: null });
  const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
  const top = rows[0]!;
  return c.json({
    success: true,
    top: {
      name: top.source,
      amount: Number(top.total),
      share: total ? (Number(top.total) / total) * 100 : 0,
    },
  });
});
app.get("/chart", requireEmployee, async (c) => {
  const year = Number(c.req.query("year") || new Date().getFullYear());
  const month = Number(c.req.query("month") || new Date().getMonth() + 1);
  const [payments, expenses] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT date(confirmed_at) AS date,COALESCE(SUM(amount),0) AS revenue FROM payments WHERE status='confirmed' AND CAST(strftime('%Y',confirmed_at) AS INTEGER)=? AND CAST(strftime('%m',confirmed_at) AS INTEGER)=? GROUP BY date(confirmed_at) ORDER BY date",
    ).bind(year, month),
    c.env.DB.prepare(
      `SELECT e.id,e.date,e.category,e.description,e.amount,e.currency,CASE WHEN e.currency='PKR' THEN e.amount ELSE e.amount*COALESCE((SELECT AVG(p.exchange_rate) FROM payments p WHERE p.status='confirmed' AND date(p.confirmed_at)<=date(e.date) AND p.exchange_rate IS NOT NULL),284.5) END AS expense_pkr FROM expenses e WHERE CAST(strftime('%Y',e.date) AS INTEGER)=? AND CAST(strftime('%m',e.date) AS INTEGER)=? ORDER BY e.date`,
    ).bind(year, month),
  ]);
  const series = [
    ...(payments?.results ?? []).map((row) => {
      const item = row as Record<string, unknown>;
      return { ...item, type: "revenue", revenue: Number(item.revenue) };
    }),
    ...(expenses?.results ?? []).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        ...item,
        type: "expense",
        expense_pkr: Number(item.expense_pkr),
        amount: Number(item.amount),
      };
    }),
  ];
  return c.json({ success: true, series });
});
export default app;
