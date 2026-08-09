// /api/bookings — booking list, detail, patch, auto-assign triggers. Skeleton.
// Source: Express routes/bookings.js (~85 lines) + services/bookingAutoAssign.js.
//
// Endpoints to port:
//   GET    /              (list w/ assignee join)
//   GET    /:id           (detail + attendees)
//   PATCH  /:id           (whitelist: status,assigned_to,notes,booking_date,booking_time)
//   POST   /:id/auto-assign            (owner/admin/head_of_delivery)
//   POST   /auto-assign/sweep          (owner/admin)
//   POST   /auto-assign/rebalance      (owner/admin)
//
// Access role: BOOKING_ACCESS = ['owner','admin','head_of_delivery','project_manager','account_manager','sales']
//
// The 60-second poller from Express now lives in src/cron.ts (Cron Trigger).

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const BOOKING_ACCESS = ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager', 'sales'];

app.get('/', requireEmployee, requireRoles(...BOOKING_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT b.*, e.name AS assignee_name
       FROM bookings b LEFT JOIN employees e ON e.id = b.assigned_to
       ORDER BY b.booking_date DESC, b.booking_time DESC`
  ).all();
  return c.json({ success: true, bookings: results });
});

// TODO: port /:id, PATCH, auto-assign endpoints.

export default app;
