// /api/requests — CRUD + breakdown + comments + activity timeline. Skeleton.
// Source: Express routes/requests.js (~264 lines) + services/requestWorkflow.js.
//
// Endpoints to port:
//   GET    /                          (list w/ client+project joins)
//   GET    /:id                       (detail with breakdown, comments, activity, files)
//   POST   /                          (create — assign queue_position atomically)
//   PATCH  /:id                       (whitelist: title,description,type,status,priority,assigned_to,
//                                                 due_date,estimated_hours,completion_percent,revision_notes,
//                                                 delivery_files,approval_status)
//   POST   /:id/comments              (internal or client-visible)
//   POST   /:id/breakdown             (propose parts — creates parent/child structure)
//   POST   /:id/breakdown/approve     (client-side approval; also on client portal)
//   PATCH  /:id/breakdown/reorder     (drag-to-reorder)
//
// Access role: MGMT = ['owner','admin','head_of_delivery','project_manager','account_manager']
//
// CRITICAL: `queue_position` used to use SELECT ... FOR UPDATE. Rewrite as
// D1 batch() — read max(queue_position) + insert in one atomic batch call.
// See services/requestWorkflow.js `nextQueuePosition` + `promoteNextQueued`.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const MGMT = ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager'];

app.get('/', requireEmployee, requireRoles(...MGMT), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, c.name AS client_name, c.company AS client_company,
            p.name AS project_name, e.name AS assigned_to_name
       FROM requests r
       LEFT JOIN clients c ON c.id = r.client_id
       LEFT JOIN projects p ON p.id = r.project_id
       LEFT JOIN employees e ON e.id = r.assigned_to
       ORDER BY r.created_at DESC LIMIT 500`
  ).all();
  return c.json({ success: true, requests: results });
});

// TODO: port /:id, POST, PATCH, comments, breakdown flow.

export default app;
