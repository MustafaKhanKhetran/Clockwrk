// /api/referrals — referrer + referral CRUD. Skeleton.
// Source: Express routes/referrals.js
// Access role: FINANCE_ACCESS = ['owner','admin','finance']

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const FINANCE_ACCESS = ['owner', 'admin', 'finance'];

app.get('/', requireEmployee, requireRoles(...FINANCE_ACCESS), async (c) => {
  const [{ results: referrers }, { results: referrals }] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM referrers ORDER BY created_at DESC').all(),
    c.env.DB.prepare('SELECT * FROM referrals ORDER BY converted_at DESC').all(),
  ]);
  return c.json({ success: true, referrers, referrals });
});

// TODO: port POST /referrers, PATCH, DELETE, referral status updates.

export default app;
