// /api/communications — internal notes on any entity. Fully ported.
// Source: Express routes/communications.js

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireEmployee } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get('/', requireEmployee, async (c) => {
  const { entity_type, entity_id } = c.req.query();
  if (!entity_type || !entity_id) return c.json({ success: false, message: 'entity_type and entity_id required' }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT a.*, e.name AS actor_name FROM audit_logs a
       LEFT JOIN employees e ON e.id = a.employee_id
       WHERE a.entity_type = ? AND a.entity_id = ? AND a.category IN ('note','communication')
       ORDER BY a.created_at DESC`
  ).bind(entity_type, entity_id).all();
  return c.json({ success: true, notes: results });
});

app.post('/note', requireEmployee, zValidator('json', z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  note: z.string().min(1),
})), async (c) => {
  const emp = c.get('employee')!;
  const { entity_type, entity_id, note } = c.req.valid('json');
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (employee_id, action, category, entity_type, entity_id, details)
     VALUES (?, 'note', 'note', ?, ?, ?)`
  ).bind(emp.id, entity_type, entity_id, JSON.stringify({ note })).run();
  return c.json({ success: true });
});

export default app;
