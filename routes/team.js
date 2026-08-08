import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const PEOPLE_ACCESS = ['owner','admin','head_of_delivery','hr','project_manager'];

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

router.post('/', authenticate, requireRoles(PEOPLE_ACCESS), async (req, res) => {
  const { name, email, password, role, department, salary, status, joined_date, phone, notes, level, max_capacity } = req.body;
  try {
    const hash = crypto.createHash('sha256').update(password || 'clockwrk123').digest('hex');
    const [result] = await db.execute(
      `INSERT INTO employees (name, email, password_hash, role, department, salary, status, joined_date, phone, notes, level, max_capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, role, department || '', salary || 0, status || 'active', joined_date || null, phone || '', notes || '', level || 'junior', max_capacity || 5]
    );
    const [[employee]] = await db.execute('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    return res.json({ success: true, employee });
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
