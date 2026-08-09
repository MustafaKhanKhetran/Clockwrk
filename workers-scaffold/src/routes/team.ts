// /api/team — employee list + detail + patch. Skeleton.
// Source: Express routes/team.js (~122 lines).
//
// Endpoints to port:
//   GET    /              (list, joins in team + capacity)
//   GET    /:id           (detail with assignments, time-log summary)
//   POST   /              (create employee — password_setup token issued here)
//   PATCH  /:id           (whitelist: name,role,department,salary,status,phone,notes,level,max_capacity,avatar_url,emergency_contact)
//   DELETE /:id           (soft delete → status='inactive')
//
// Access role: PEOPLE_ACCESS = ['owner','admin','head_of_delivery']

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const PEOPLE_ACCESS = ['owner', 'admin', 'head_of_delivery'];

app.get('/', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, email, role, department, level, status, avatar_url, max_capacity, salary, created_at, last_seen_at FROM employees ORDER BY name'
  ).all();
  return c.json({ success: true, employees: results });
});

// TODO: port /:id, POST, PATCH, DELETE — see auth.ts + clients.ts for pattern.

export default app;
