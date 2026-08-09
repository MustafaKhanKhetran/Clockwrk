// /api/stats — dashboard summary widgets.
// SKELETON — port from Express routes/stats.js.
//
// Endpoints to port (all authenticated, no specific role):
//   GET /            → returns { clients, projects, requests, revenue_30d, ... }
//
// Notes for porting:
//   • MySQL: DATE_SUB(CURDATE(), INTERVAL 30 DAY)  → SQLite: datetime('now','-30 days')
//   • MySQL: WEEK(NOW(), 1)                        → SQLite: strftime('%W','now')
//   • MySQL: MONTH(NOW())                          → SQLite: strftime('%m','now')

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get('/', requireEmployee, async (c) => {
  // TODO: port the aggregate queries from Express routes/stats.js
  // Response shape is used by the dashboard Overview page — match exactly.
  return c.json({ success: true, stats: {} });
});

export default app;
