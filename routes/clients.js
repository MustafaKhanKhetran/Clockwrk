import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

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

// Add client
router.post('/', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  const { name, email, company, plan, billing, whitelabel, payment_ref, referral_code, notes } = req.body;
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
    const [[client]] = await db.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
    return res.json({ success: true, client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update client
router.patch('/:id', authenticate, requireRoles(CLIENT_ACCESS), async (req, res) => {
  const { id } = req.params;
  const { status, plan, billing, whitelabel, notes, next_payment_due } = req.body;
  try {
    const fields = [];
    const params = [];
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (plan !== undefined) { fields.push('plan = ?'); params.push(plan); }
    if (billing !== undefined) { fields.push('billing = ?'); params.push(billing); }
    if (whitelabel !== undefined) { fields.push('whitelabel = ?'); params.push(whitelabel ? 1 : 0); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
    if (next_payment_due !== undefined) { fields.push('next_payment_due = ?'); params.push(next_payment_due); }
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

export default router;
