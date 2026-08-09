// /api/alerts — dashboard notification feed. Fully ported.
// Source: Express routes/alerts.js

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get('/', requireEmployee, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, type, title, message, link, read_at, created_at
       FROM dashboard_alerts ORDER BY created_at DESC LIMIT 100`
  ).all();
  return c.json({ success: true, alerts: results });
});

app.patch('/:id/read', requireEmployee, async (c) => {
  await c.env.DB.prepare('UPDATE dashboard_alerts SET read_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/mark-all-read', requireEmployee, async (c) => {
  await c.env.DB.prepare('UPDATE dashboard_alerts SET read_at = CURRENT_TIMESTAMP WHERE read_at IS NULL').run();
  return c.json({ success: true });
});

app.delete('/clear-read', requireEmployee, async (c) => {
  await c.env.DB.prepare('DELETE FROM dashboard_alerts WHERE read_at IS NOT NULL').run();
  return c.json({ success: true });
});

export default app;
