// /api/calendar — unified date-based feed across bookings, requests, projects, payments. Skeleton.
// Source: Express routes/calendar.js (~152 lines).
//
// Endpoints to port:
//   GET /            → merged list of upcoming dates
//   GET /:id         → detail for a single calendar item (routed by kind)

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get('/', requireEmployee, async (c) => {
  // TODO: merge results from bookings, requests (due_date), projects (start/due),
  // payments (next_payment_due). Return unified array of {kind, id, title, when, ...}.
  return c.json({ success: true, events: [] });
});

export default app;
