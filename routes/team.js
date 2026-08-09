import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const PEOPLE_ACCESS = ['owner','admin','head_of_delivery','hr','project_manager'];
const ROLE_VALUES = ['owner','admin','head_of_design','head_of_development','head_of_delivery','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer','sales','marketing_manager','seo_specialist','social_media_manager','content_writer','operations_manager','finance','hr','legal','executive_assistant','support','viewer'];
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');

router.get('/', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  try {
    const [employees] = await db.execute(
      `SELECT e.*,
        (SELECT COUNT(*) FROM requests r WHERE r.assigned_to = e.id AND r.status NOT IN ('completed') AND r.request_kind != 'parent') AS active_requests,
        (e.last_seen_at IS NOT NULL AND e.last_seen_at >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)) AS is_online
       FROM employees e
       ORDER BY is_online DESC, (e.last_seen_at IS NULL) ASC, e.last_seen_at DESC, e.name ASC`
    );
    const [teams] = await db.execute(
      `SELECT t.*, e.name AS lead_name,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', em.id, 'name', em.name, 'role', em.role))
         FROM assignments a JOIN employees em ON em.id = a.employee_id
         WHERE a.entity_type = 'team' AND a.entity_id = t.id) AS members
       FROM teams t LEFT JOIN employees e ON e.id = t.lead_id`
    );
    return res.json({ success: true, employees, teams });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  try {
    const [[employee]] = await db.execute(
      `SELECT e.id, e.name, e.email, e.role, e.level, e.max_capacity, e.department, e.salary,
              e.status, e.joined_date, e.created_at, e.phone, e.avatar_url, e.emergency_contact,
              e.notes, e.last_seen_at,
              (SELECT COUNT(*) FROM requests r WHERE r.assigned_to=e.id AND r.status != 'completed' AND r.request_kind != 'parent') AS active_requests
         FROM employees e WHERE e.id = ?`, [req.params.id]
    );
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const [requests] = await db.execute(
      `SELECT r.id, r.title, r.status, r.priority, r.due_date, p.name AS project_name, c.company AS client_company
         FROM requests r LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN clients c ON c.id=r.client_id
        WHERE r.assigned_to=? AND r.request_kind != 'parent' ORDER BY FIELD(r.status,'revision','in_review','in_progress','queue','completed'), r.due_date`,
      [employee.id]
    );
    const [time_logs] = await db.execute(
      `SELECT t.*, p.name AS project_name, r.title AS request_title FROM time_logs t
        LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN requests r ON r.id=t.request_id
        WHERE t.employee_id=? ORDER BY t.log_date DESC LIMIT 20`, [employee.id]
    );
    return res.json({ success: true, employee, requests, time_logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  const { name, email, role, department, salary, joined_date, phone, notes, level, max_capacity, dashboard_base_url } = req.body;
  try {
    if (!name || !email || !ROLE_VALUES.includes(role)) return res.status(400).json({ success: false, message: 'Name, email and a valid role are required.' });
    const token = crypto.randomBytes(32).toString('base64url');
    const unusablePassword = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
    const [result] = await db.execute(
      `INSERT INTO employees (name, email, password_hash, role, department, salary, status, joined_date, phone, notes, level, max_capacity,
       password_setup_token_hash, password_setup_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'inactive', ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))`,
      [name, email, unusablePassword, role, department || '', salary || 0, joined_date || null, phone || '', notes || '', level || 'junior', max_capacity || 5, hashToken(token)]
    );
    const [[employee]] = await db.execute('SELECT id, name, email, role, department, status, joined_date, level, max_capacity FROM employees WHERE id = ?', [result.insertId]);
    const base = String(dashboard_base_url || '').replace(/\/+$/, '');
    const path = `/setup-password?token=${token}`;
    return res.json({ success: true, employee, invite_url: base ? `${base}${path}` : path, invite_expires_hours: 72 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/invite', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  try {
    const [[employee]] = await db.execute('SELECT id, name, email, status FROM employees WHERE id = ?', [req.params.id]);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.status === 'active') return res.status(409).json({ success: false, message: 'This employee already has an active login.' });
    const token = crypto.randomBytes(32).toString('base64url');
    await db.execute(
      'UPDATE employees SET password_setup_token_hash = ?, password_setup_expires_at = DATE_ADD(NOW(), INTERVAL 72 HOUR) WHERE id = ?',
      [hashToken(token), employee.id]
    );
    const base = String(req.body?.dashboard_base_url || '').replace(/\/+$/, '');
    const path = `/setup-password?token=${token}`;
    return res.json({ success: true, employee, invite_url: base ? `${base}${path}` : path, invite_expires_hours: 72 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  const allowed = ['name','role','department','salary','status','phone','notes','level','max_capacity','avatar_url','emergency_contact'];
  const fields = []; const params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
  }
  if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(req.params.id);
  try {
    await db.execute(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, params);
    const [[employee]] = await db.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    return res.json({ success: true, employee });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
