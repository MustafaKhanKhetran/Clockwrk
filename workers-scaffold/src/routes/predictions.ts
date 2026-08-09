// /api/predictions — payment prediction runs + reports. Skeleton.
// Source: Express routes/predictions.js (~299 lines) — a lot of internal logic.
//
// Endpoints to port:
//   POST /run        (owner/admin only — runs a prediction cycle, writes to prediction_runs)
//   GET  /           (owner/admin — list runs)
//
// This route is heavy compute — long jobs in Workers should probably use
// Queues + a scheduled trigger, not a synchronous HTTP call. Consider
// moving /run to a queue producer that returns immediately.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const OWNER_ADMIN = ['owner', 'admin'];

app.get('/', requireEmployee, requireRoles(...OWNER_ADMIN), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM prediction_runs ORDER BY created_at DESC LIMIT 50'
  ).all();
  return c.json({ success: true, runs: results });
});

// TODO: port POST /run — the actual prediction logic from Express routes/predictions.js.

export default app;
