// /api/projects — project CRUD, project links, project resources. Skeleton.
// Source: Express routes/projects.js (~153 lines).
//
// Endpoints to port:
//   GET    /                     (list w/ client + PM joins)
//   GET    /:id                  (detail with requests, files, links, resources)
//   POST   /                     (create — associate with client)
//   PATCH  /:id                  (whitelist: name,type,icon_emoji,status,notes,goal,audience,success_measure,
//                                            project_manager_id,priority,progress_percent,start_date,due_date,
//                                            estimated_hours,github_repo,staging_url,live_url,tech_stack,health_status)
//   POST   /:id/links            (add link — kind, label, url)
//   DELETE /:id/links/:linkId
//   POST   /:id/resources        (add file resource)
//   DELETE /:id/resources/:id
//
// Access role: PROJECT_ACCESS = ['owner','admin','head_of_delivery','project_manager','account_manager']

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const PROJECT_ACCESS = ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager'];

app.get('/', requireEmployee, requireRoles(...PROJECT_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, c.name AS client_name, c.company AS client_company,
            e.name AS project_manager_name
       FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN employees e ON e.id = p.project_manager_id
       ORDER BY p.created_at DESC`
  ).all();
  return c.json({ success: true, projects: results });
});

// TODO: port /:id, POST, PATCH, links, resources — see clients.ts for pattern.

export default app;
