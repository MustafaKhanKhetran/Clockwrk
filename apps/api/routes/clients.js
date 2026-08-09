import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const RESET_TOKEN_TTL_MIN = 60;
const SETUP_TOKEN_TTL_MIN = 72 * 60;
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const CLIENT_PORTAL_URL = String(process.env.CLIENT_PORTAL_URL || 'https://my.clockwrk.io').replace(/\/+$/, '');
const resolvePortalBase = (requested) => {
  const value = String(requested || '').trim().replace(/\/+$/, '');
  return /^https?:\/\/localhost(?::\d+)?$/i.test(value) ? value : CLIENT_PORTAL_URL;
};

const router = Router();

const CLIENT_ACCESS = ['owner','admin','head_of_delivery','project_manager','account_manager','sales','finance','support'];

// List clients
router.get('/', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
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
          AND p.confirmed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS revenue_30d,
        (SELECT p.amount FROM payments p WHERE p.client_id = c.id AND p.status = 'confirmed'
         ORDER BY p.confirmed_at DESC LIMIT 1) AS billing_amount
      FROM clients c
    `;
    const params = [];
    const where = [];
    if (status) { where.push('c.status = ?'); params.push(status); }
    if (employee_id && ['project_manager','account_manager'].includes(req.user.role)) {
      where.push(`c.id IN (SELECT entity_id FROM assignments WHERE entity_type = 'client' AND employee_id = ?)`);
      params.push(employee_id);
    }
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY c.subscribed_at DESC';
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, clients: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  try {
    const [[client]] = await db.execute(
      `SELECT c.*,
        (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id AND p.status='active') AS active_projects,
        (SELECT COUNT(*) FROM requests r WHERE r.client_id=c.id AND r.request_kind!='parent' AND r.status!='completed') AS active_requests,
        (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.client_id=c.id AND pay.status='pending') AS outstanding_amount
       FROM clients c WHERE c.id=?`, [req.params.id]
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const [projects] = await db.execute(
      `SELECT p.*,
        (SELECT COUNT(*) FROM requests r WHERE r.project_id=p.id AND r.request_kind!='parent' AND r.status!='completed') AS active_requests
       FROM projects p WHERE p.client_id=? ORDER BY p.created_at DESC`, [client.id]
    );
    const [requests] = await db.execute(
      `SELECT r.*, p.name AS project_name, e.name AS assigned_to_name
       FROM requests r LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN employees e ON e.id=r.assigned_to
       WHERE r.client_id=? ORDER BY r.created_at DESC LIMIT 100`, [client.id]
    );
    const [payments] = await db.execute('SELECT * FROM payments WHERE client_id=? ORDER BY submitted_at DESC', [client.id]);
    const [files] = await db.execute(
      `SELECT f.*, p.name AS project_name, r.title AS request_title FROM files f
       LEFT JOIN projects p ON p.id=f.project_id LEFT JOIN requests r ON r.id=f.request_id
       WHERE f.client_id=? ORDER BY f.created_at DESC`, [client.id]
    );
    const [communications] = await db.execute(
      `SELECT * FROM client_messages WHERE client_id=? ORDER BY created_at DESC LIMIT 50`, [client.id]
    );
    return res.json({ success: true, client, projects, requests, payments, files, communications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add client
router.post('/', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  const { name, email, company, plan, billing, whitelabel, payment_ref, referral_code, notes, portal_base_url } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO clients (name, email, company, plan, billing, whitelabel, status, payment_ref, referral_code, notes, subscribed_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
      [name, email, company, plan, billing, whitelabel ? 1 : 0, payment_ref || '', referral_code || '', notes || '']
    );
    const clientId = result.insertId;
    await db.execute(
      `INSERT INTO projects (client_id, name, status) VALUES (?, ?, 'active')`,
      [clientId, `${company || name} Project`]
    );
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'New client added', ?, '/clients')`,
      [`${name} (${company}) added as ${plan} client`]
    );
    const rawToken = crypto.randomBytes(24).toString('base64url');
    await db.execute(
      'UPDATE clients SET account_setup_token_hash = ?, account_setup_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [hashToken(rawToken), SETUP_TOKEN_TTL_MIN, clientId]
    );
    const [[client]] = await db.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
    const base = resolvePortalBase(portal_base_url);
    const path = `/setup?token=${rawToken}`;
    return res.json({
      success: true,
      client,
      invite_url: `${base}${path}`,
      invite_expires_minutes: SETUP_TOKEN_TTL_MIN,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update client
router.patch('/:id', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name','email','phone','company','status','plan','billing','whitelabel','notes','next_payment_due','payment_ref'];
  if (['owner', 'admin'].includes(req.user.role)) allowed.push('portal_role');
  try {
    const fields = [];
    const params = [];
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === 'portal_role' && !['admin', 'member'].includes(req.body[key])) {
        return res.status(400).json({ success: false, message: 'Invalid portal role' });
      }
      fields.push(`${key} = ?`);
      params.push(key === 'whitelabel' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    await db.execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, params);
    const [[client]] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    return res.json({ success: true, client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate a first-time setup URL. Setup tokens are separate from password
// reset tokens so onboarding cannot accidentally invalidate a genuine reset.
router.post('/:id/setup-token', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  try {
    const [[client]] = await db.execute(
      'SELECT id, name, email, account_setup_completed_at FROM clients WHERE id = ?',
      [req.params.id]
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    if (client.account_setup_completed_at) {
      return res.status(409).json({ success: false, message: 'This client has already completed setup. Generate a password reset link instead.' });
    }
    const rawToken = crypto.randomBytes(24).toString('base64url');
    await db.execute(
      'UPDATE clients SET account_setup_token_hash = ?, account_setup_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [hashToken(rawToken), SETUP_TOKEN_TTL_MIN, client.id]
    );
    const base = resolvePortalBase(req.body?.portal_base_url);
    const path = `/setup?token=${rawToken}`;
    return res.json({
      success: true,
      client: { id: client.id, name: client.name, email: client.email },
      token: rawToken,
      path,
      url: `${base}${path}`,
      expires_in_minutes: SETUP_TOKEN_TTL_MIN,
      purpose: 'setup',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate a password reset URL for an established account.
router.post('/:id/reset-token', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  try {
    const [[client]] = await db.execute('SELECT id, name, email FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const rawToken = crypto.randomBytes(24).toString('base64url');
    await db.execute(
      'UPDATE clients SET password_reset_token_hash = ?, password_reset_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [hashToken(rawToken), RESET_TOKEN_TTL_MIN, client.id]
    );
    const base = resolvePortalBase(req.body?.portal_base_url);
    const path = `/reset-password?token=${rawToken}`;
    return res.json({
      success: true,
      client: { id: client.id, name: client.name, email: client.email },
      token: rawToken,
      path,
      url: `${base}${path}`,
      expires_in_minutes: RESET_TOKEN_TTL_MIN,
      purpose: 'reset',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
