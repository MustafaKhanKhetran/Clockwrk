// /api/finance — payments, expenses, subscription changes, P&L. Skeleton.
// Source: Express routes/finance.js (~357 lines) + services/billingChanges.js.
//
// Endpoints to port:
//   GET    /                              (summary aggregate)
//   GET    /payments                      (list + status filter)
//   POST   /payments/:id/confirm          (transactional: mark paid, insert alert, post invoice message)
//   POST   /payments/:id/reject
//   GET    /expenses                      (list)
//   POST   /expenses
//   PATCH  /expenses/:id
//   DELETE /expenses/:id
//   GET    /subscription-changes          (list pending)
//   POST   /subscription-changes/:id/verify  (applies plan change via services/billingChanges.applyChange)
//   POST   /subscription-changes/:id/reject
//   GET    /pnl                           (P&L range aggregate)
//
// Access role: FINANCE_ACCESS = ['owner','admin','finance']
//
// When a payment/subscription-change is confirmed, also post an invoice
// message to the client's messages thread — see services/publicSiteEmails.ts
// for the pattern (postInvoiceMessage in the Express version).

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const FINANCE_ACCESS = ['owner', 'admin', 'finance'];

app.get('/payments', requireEmployee, requireRoles(...FINANCE_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, c.name AS client_name, c.company AS client_company
       FROM payments p LEFT JOIN clients c ON c.id = p.client_id
       ORDER BY p.submitted_at DESC LIMIT 500`
  ).all();
  return c.json({ success: true, payments: results });
});

// TODO: port confirm/reject flows + subscription-changes + expenses + P&L.

export default app;
