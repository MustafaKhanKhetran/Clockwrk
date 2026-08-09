// /api/hr — job listings + applications + internships. Skeleton.
// Source: Express routes/hr.js (~250 lines).
//
// Endpoints to port:
//   POST   /apply/job                    (public, rate-limited — see ipRateLimit)
//   POST   /apply/internship             (public, rate-limited)
//   GET    /                             (all listings + applications)
//   PATCH  /applications/:id             (status change + status log)
//   DELETE /applications/:id             (owner/admin/hr)
//   POST   /listings                     (create listing)
//   PATCH  /listings/:id
//   PATCH  /listings/:id/toggle          (activate/deactivate)
//   DELETE /listings/:id                 (owner/admin)
//
// Access role: HR_ACCESS = ['owner','admin','hr']
//
// UUID note: MySQL used UUID(). In SQLite use crypto.randomUUID() from the
// Workers runtime — pass it as a bound param, not embedded in SQL.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';
import { ipRateLimit } from '../middleware/rateLimit';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const HR_ACCESS = ['owner', 'admin', 'hr'];
const applyLimit = ipRateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'hr-apply' });

app.post('/apply/job', applyLimit, async (c) => {
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body?.full_name || !body?.email) {
    return c.json({ success: false, message: 'full_name and email are required' }, 400);
  }
  // TODO: port the 24-field insert from Express routes/hr.js
  return c.json({ success: true, message: 'Application received' });
});

// TODO: port /apply/internship, GET, PATCH, DELETE, listings CRUD.

export default app;
