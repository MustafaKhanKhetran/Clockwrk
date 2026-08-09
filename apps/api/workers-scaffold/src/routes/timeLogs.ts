// /api/time-logs — time entries with per-employee edit rules. Skeleton.
// Source: Express routes/timeLogs.js (~74 lines).
//
// Endpoints to port:
//   GET    /                          (list w/ request+project joins)
//   POST   /                          (create entry — creator or owner/admin)
//   PATCH  /:id                       (whitelist: request_id,project_id,hours,description,log_date)
//                                     — only the owning employee OR owner/admin
//   DELETE /:id                       (same authorship rule)
//
// Access role: TIME_ACCESS = every worker role — see routes/timeLogs.js

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const TIME_ACCESS = ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager',
  'designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor',
  'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer',
  'devops', 'qa_engineer'];

app.get('/', requireEmployee, requireRoles(...TIME_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tl.*, e.name AS employee_name, r.title AS request_title, p.name AS project_name
       FROM time_logs tl
       LEFT JOIN employees e ON e.id = tl.employee_id
       LEFT JOIN requests r ON r.id = tl.request_id
       LEFT JOIN projects p ON p.id = tl.project_id
       ORDER BY tl.log_date DESC, tl.created_at DESC LIMIT 500`
  ).all();
  return c.json({ success: true, time_logs: results });
});

// TODO: port POST, PATCH, DELETE with authorship checks.

export default app;
