import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';
import { futureIsoMinutes } from '../lib/db';
import { randomToken, sha256Hex } from '../lib/tokens';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const PEOPLE_ACCESS = ['owner','admin','head_of_delivery','hr','project_manager'];
const ROLE_VALUES = new Set(['owner','admin','head_of_design','head_of_development','head_of_delivery','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer','sales','marketing_manager','seo_specialist','social_media_manager','content_writer','operations_manager','finance','hr','legal','executive_assistant','support','viewer']);

app.get('/', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const [employees, teams] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT e.*,
      (SELECT COUNT(*) FROM requests r WHERE r.assigned_to=e.id AND r.status!='completed' AND r.request_kind!='parent') AS active_requests,
      (e.last_seen_at IS NOT NULL AND e.last_seen_at >= datetime('now','-3 minutes')) AS is_online
      FROM employees e ORDER BY is_online DESC, (e.last_seen_at IS NULL) ASC, e.last_seen_at DESC, e.name ASC`),
    c.env.DB.prepare(`SELECT t.*, e.name AS lead_name,
      (SELECT json_group_array(json_object('id',em.id,'name',em.name,'role',em.role))
       FROM assignments a JOIN employees em ON em.id=a.employee_id
       WHERE a.entity_type='team' AND a.entity_id=t.id) AS members
      FROM teams t LEFT JOIN employees e ON e.id=t.lead_id`),
  ]);
  return c.json({ success: true, employees: employees?.results ?? [], teams: teams?.results ?? [] });
});

app.get('/:id', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const id = c.req.param('id');
  const employee = await c.env.DB.prepare(`SELECT e.id,e.name,e.email,e.role,e.level,e.max_capacity,e.department,e.salary,
    e.status,e.joined_date,e.created_at,e.phone,e.avatar_url,e.emergency_contact,e.notes,e.last_seen_at,
    (SELECT COUNT(*) FROM requests r WHERE r.assigned_to=e.id AND r.status!='completed' AND r.request_kind!='parent') AS active_requests
    FROM employees e WHERE e.id=?`).bind(id).first();
  if (!employee) return c.json({ success: false, message: 'Employee not found' }, 404);
  const [requests, timeLogs] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT r.id,r.title,r.status,r.priority,r.due_date,p.name AS project_name,c.company AS client_company
      FROM requests r LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN clients c ON c.id=r.client_id
      WHERE r.assigned_to=? AND r.request_kind!='parent'
      ORDER BY CASE r.status WHEN 'revision' THEN 1 WHEN 'in_review' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'queue' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END,r.due_date`).bind(id),
    c.env.DB.prepare(`SELECT t.*,p.name AS project_name,r.title AS request_title FROM time_logs t
      LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN requests r ON r.id=t.request_id
      WHERE t.employee_id=? ORDER BY t.log_date DESC LIMIT 20`).bind(id),
  ]);
  return c.json({ success: true, employee, requests: requests?.results ?? [], time_logs: timeLogs?.results ?? [] });
});

app.post('/', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const name = String(body.name || ''); const email = String(body.email || ''); const role = String(body.role || '');
  if (!name || !email || !ROLE_VALUES.has(role)) return c.json({ success: false, message: 'Name, email and a valid role are required.' }, 400);
  const token = randomToken(32);
  const unusablePassword = await bcrypt.hash(randomToken(48), 12);
  const result = await c.env.DB.prepare(`INSERT INTO employees
    (name,email,password_hash,role,department,salary,status,joined_date,phone,notes,level,max_capacity,password_setup_token_hash,password_setup_expires_at)
    VALUES (?,?,?,?,?,?,'inactive',?,?,?,?,?,?,?)`).bind(
      name,email,unusablePassword,role,body.department || '',body.salary || 0,body.joined_date || null,body.phone || '',body.notes || '',body.level || 'junior',body.max_capacity || 5,await sha256Hex(token),futureIsoMinutes(72*60),
    ).run();
  const employee = await c.env.DB.prepare('SELECT id,name,email,role,department,status,joined_date,level,max_capacity FROM employees WHERE id=?').bind(result.meta.last_row_id).first();
  const base = String(body.dashboard_base_url || '').replace(/\/+$/, '');
  const path = `/setup-password?token=${token}`;
  return c.json({ success: true, employee, invite_url: base ? `${base}${path}` : path, invite_expires_hours: 72 });
});

app.post('/:id/invite', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const id = c.req.param('id');
  const employee = await c.env.DB.prepare('SELECT id,name,email,status FROM employees WHERE id=?').bind(id).first<{id:number;name:string;email:string;status:string}>();
  if (!employee) return c.json({ success: false, message: 'Employee not found' }, 404);
  if (employee.status === 'active') return c.json({ success: false, message: 'This employee already has an active login.' }, 409);
  const token = randomToken(32);
  await c.env.DB.prepare('UPDATE employees SET password_setup_token_hash=?,password_setup_expires_at=? WHERE id=?').bind(await sha256Hex(token),futureIsoMinutes(72*60),id).run();
  const body: {dashboard_base_url?:string} = await c.req.json<{dashboard_base_url?:string}>().catch(() => ({}));
  const base = String(body.dashboard_base_url || '').replace(/\/+$/, '');
  const path = `/setup-password?token=${token}`;
  return c.json({ success: true, employee, invite_url: base ? `${base}${path}` : path, invite_expires_hours: 72 });
});

app.patch('/:id', requireEmployee, requireRoles(...PEOPLE_ACCESS), async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const allowed = ['name','role','department','salary','status','phone','notes','level','max_capacity','avatar_url','emergency_contact'];
  const fields:string[]=[]; const params:unknown[]=[];
  for (const key of allowed) if (body[key] !== undefined) { fields.push(`${key}=?`); params.push(body[key]); }
  if (!fields.length) return c.json({ success: false, message: 'No fields to update' }, 400);
  const id = c.req.param('id');
  await c.env.DB.prepare(`UPDATE employees SET ${fields.join(',')} WHERE id=?`).bind(...params,id).run();
  const employee = await c.env.DB.prepare('SELECT * FROM employees WHERE id=?').bind(id).first();
  return c.json({ success: true, employee });
});

export default app;
