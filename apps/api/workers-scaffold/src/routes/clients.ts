// /api/clients — full CRUD for clients + setup/reset token generation.
// Ported from Express routes/clients.js. The complicated JOIN aggregates
// stay the same — SQLite handles subqueries fine, only date arithmetic
// changes (DATE_SUB(CURDATE(), INTERVAL 30 DAY) → datetime('now','-30 days')).

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';
import { sha256Hex, randomToken } from '../lib/tokens';
import { futureIsoMinutes } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const CLIENT_ACCESS = ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager', 'sales', 'finance', 'support'];
const RESET_TOKEN_TTL_MIN = 60;
const SETUP_TOKEN_TTL_MIN = 72 * 60;

// The portal deploy URL comes from an env var so we don't hardcode it; we
// still accept a portal_base_url override for local dev (localhost only).
const resolvePortalBase = (fromRequest: string | undefined | null, fallback: string) => {
  const v = String(fromRequest || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(v)) return v;
  return fallback.replace(/\/+$/, '');
};
const DEFAULT_PORTAL = 'https://my.clockwrk.io';

// ─── LIST ─────────────────────────────────────────────────────────
app.get('/', requireEmployee, requireRoles(...CLIENT_ACCESS), async (c) => {
  const emp = c.get('employee')!;
  const status = c.req.query('status');
  const employee_id = c.req.query('employee_id');

  const where: string[] = [];
  const params: unknown[] = [];
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (employee_id && ['project_manager', 'account_manager'].includes(emp.role)) {
    where.push(`c.id IN (SELECT entity_id FROM assignments WHERE entity_type = 'client' AND employee_id = ?)`);
    params.push(employee_id);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT c.*,
      (SELECT em.name FROM assignments a JOIN employees em ON em.id = a.employee_id
       WHERE a.entity_type='client' AND a.entity_id = c.id AND a.subtype='lead'
         AND em.role='project_manager' LIMIT 1) AS pm_name,
      (SELECT em.name FROM assignments a JOIN employees em ON em.id = a.employee_id
       WHERE a.entity_type='client' AND a.entity_id = c.id AND a.subtype='lead'
         AND em.role='account_manager' LIMIT 1) AS am_name,
      (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.status = 'active') AS active_projects,
      (SELECT COUNT(*) FROM requests r WHERE r.client_id = c.id AND r.status != 'completed' AND r.request_kind != 'parent') AS active_requests,
      (SELECT p.amount FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed'
       ORDER BY p.confirmed_at DESC LIMIT 1) AS last_payment_amount,
      (SELECT p.confirmed_at FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed'
       ORDER BY p.confirmed_at DESC LIMIT 1) AS last_payment_at,
      (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed') AS total_revenue,
      (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed'
        AND p.confirmed_at >= datetime('now','-30 days')) AS revenue_30d,
      (SELECT p.amount FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed'
       ORDER BY p.confirmed_at DESC LIMIT 1) AS billing_amount
    FROM clients c${whereSql}
    ORDER BY c.subscribed_at DESC
  `;
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ success: true, clients: results });
});

// ─── DETAIL ───────────────────────────────────────────────────────
app.get('/:id', requireEmployee, requireRoles(...CLIENT_ACCESS), async (c) => {
  const id = c.req.param('id');
  const client = await c.env.DB.prepare(
    `SELECT c.*,
      (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id AND p.status='active') AS active_projects,
      (SELECT COUNT(*) FROM requests r WHERE r.client_id=c.id AND r.request_kind!='parent' AND r.status!='completed') AS active_requests,
      (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.client_id=c.id AND pay.status='pending') AS outstanding_amount
     FROM clients c WHERE c.id = ?`
  ).bind(id).first();
  if (!client) return c.json({ success: false, message: 'Client not found' }, 404);

  const [projects, requests, payments, files, communications] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM requests r WHERE r.project_id=p.id AND r.request_kind!='parent' AND r.status!='completed') AS active_requests
       FROM projects p WHERE p.client_id=? ORDER BY p.created_at DESC`
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT r.*, p.name AS project_name, e.name AS assigned_to_name
       FROM requests r LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN employees e ON e.id=r.assigned_to
       WHERE r.client_id=? ORDER BY r.created_at DESC LIMIT 100`
    ).bind(id).all(),
    c.env.DB.prepare('SELECT * FROM payments WHERE client_id=? ORDER BY submitted_at DESC').bind(id).all(),
    c.env.DB.prepare(
      `SELECT f.*, p.name AS project_name, r.title AS request_title FROM files f
       LEFT JOIN projects p ON p.id=f.project_id LEFT JOIN requests r ON r.id=f.request_id
       WHERE f.client_id=? ORDER BY f.created_at DESC`
    ).bind(id).all(),
    c.env.DB.prepare('SELECT * FROM client_messages WHERE client_id=? ORDER BY created_at DESC LIMIT 50').bind(id).all(),
  ]);

  return c.json({
    success: true, client,
    projects: projects.results,
    requests: requests.results,
    payments: payments.results,
    files: files.results,
    communications: communications.results,
  });
});

// ─── CREATE ───────────────────────────────────────────────────────
const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  billing: z.string().nullable().optional(),
  whitelabel: z.boolean().optional(),
  payment_ref: z.string().optional(),
  referral_code: z.string().optional(),
  notes: z.string().optional(),
  portal_base_url: z.string().optional(),
});

app.post('/', requireEmployee, requireRoles(...CLIENT_ACCESS), zValidator('json', createClientSchema), async (c) => {
  const body = c.req.valid('json');
  const insertRes = await c.env.DB.prepare(
    `INSERT INTO clients (name, email, company, plan, billing, whitelabel, status, payment_ref, referral_code, notes, subscribed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    body.name, body.email, body.company ?? null, body.plan ?? null, body.billing ?? null,
    body.whitelabel ? 1 : 0, body.payment_ref || '', body.referral_code || '', body.notes || '',
  ).run();

  const clientId = insertRes.meta.last_row_id;

  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO projects (client_id, name, status) VALUES (?, ?, 'active')`)
      .bind(clientId, `${body.company || body.name} Project`),
    c.env.DB.prepare(
      `INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'New client added', ?, '/clients')`
    ).bind(`${body.name} (${body.company}) added as ${body.plan} client`),
  ]);

  const raw = randomToken(24);
  await c.env.DB.prepare(
    'UPDATE clients SET account_setup_token_hash = ?, account_setup_expires_at = ? WHERE id = ?'
  ).bind(await sha256Hex(raw), futureIsoMinutes(SETUP_TOKEN_TTL_MIN), clientId).run();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
  const base = resolvePortalBase(body.portal_base_url, DEFAULT_PORTAL);
  return c.json({
    success: true,
    client,
    invite_url: `${base}/setup?token=${raw}`,
    invite_expires_minutes: SETUP_TOKEN_TTL_MIN,
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────
const ALLOWED_FIELDS = ['name', 'email', 'phone', 'company', 'status', 'plan', 'billing', 'whitelabel', 'notes', 'next_payment_due', 'payment_ref'] as const;
const PORTAL_ROLE_VALUES = new Set(['admin', 'member']);

app.patch('/:id', requireEmployee, requireRoles(...CLIENT_ACCESS), async (c) => {
  const emp = c.get('employee')!;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  const fields: string[] = [];
  const params: unknown[] = [];

  for (const key of ALLOWED_FIELDS) {
    if (body[key] === undefined) continue;
    fields.push(`${key} = ?`);
    params.push(key === 'whitelabel' ? (body[key] ? 1 : 0) : body[key]);
  }
  if (body.portal_role !== undefined && ['owner', 'admin'].includes(emp.role)) {
    if (!PORTAL_ROLE_VALUES.has(String(body.portal_role))) {
      return c.json({ success: false, message: 'Invalid portal role' }, 400);
    }
    fields.push('portal_role = ?');
    params.push(body.portal_role);
  }
  if (!fields.length) return c.json({ success: false, message: 'No fields to update' }, 400);

  params.push(id);
  await c.env.DB.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  return c.json({ success: true, client });
});

// ─── SETUP-TOKEN ──────────────────────────────────────────────────
app.post('/:id/setup-token', requireEmployee, requireRoles(...CLIENT_ACCESS), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as { portal_base_url?: string };
  const client = await c.env.DB.prepare(
    'SELECT id, name, email, account_setup_completed_at FROM clients WHERE id = ?'
  ).bind(id).first<{ id: number; name: string; email: string; account_setup_completed_at: string | null }>();
  if (!client) return c.json({ success: false, message: 'Client not found' }, 404);
  if (client.account_setup_completed_at) {
    return c.json({
      success: false,
      message: 'This client has already completed setup. Generate a password reset link instead.',
    }, 409);
  }
  const raw = randomToken(24);
  await c.env.DB.prepare(
    'UPDATE clients SET account_setup_token_hash = ?, account_setup_expires_at = ? WHERE id = ?'
  ).bind(await sha256Hex(raw), futureIsoMinutes(SETUP_TOKEN_TTL_MIN), client.id).run();
  const base = resolvePortalBase(body.portal_base_url, DEFAULT_PORTAL);
  const path = `/setup?token=${raw}`;
  return c.json({
    success: true,
    client: { id: client.id, name: client.name, email: client.email },
    token: raw, path, url: `${base}${path}`,
    expires_in_minutes: SETUP_TOKEN_TTL_MIN,
    purpose: 'setup',
  });
});

// ─── RESET-TOKEN ──────────────────────────────────────────────────
app.post('/:id/reset-token', requireEmployee, requireRoles(...CLIENT_ACCESS), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as { portal_base_url?: string };
  const client = await c.env.DB.prepare('SELECT id, name, email FROM clients WHERE id = ?').bind(id).first<{ id: number; name: string; email: string }>();
  if (!client) return c.json({ success: false, message: 'Client not found' }, 404);
  const raw = randomToken(24);
  await c.env.DB.prepare(
    'UPDATE clients SET password_reset_token_hash = ?, password_reset_expires_at = ? WHERE id = ?'
  ).bind(await sha256Hex(raw), futureIsoMinutes(RESET_TOKEN_TTL_MIN), client.id).run();
  const base = resolvePortalBase(body.portal_base_url, DEFAULT_PORTAL);
  const path = `/reset-password?token=${raw}`;
  return c.json({
    success: true,
    client: { id: client.id, name: client.name, email: client.email },
    token: raw, path, url: `${base}${path}`,
    expires_in_minutes: RESET_TOKEN_TTL_MIN,
    purpose: 'reset',
  });
});

export default app;
