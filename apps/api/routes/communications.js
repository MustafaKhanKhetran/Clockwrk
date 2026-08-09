import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    let query = `
      SELECT al.*, e.name AS employee_name, e.role AS employee_role
      FROM audit_logs al LEFT JOIN employees e ON e.id = al.employee_id
    `;
    const params = []; const where = [];
    if (entity_type) { where.push('al.entity_type = ?'); params.push(entity_type); }
    if (entity_id) { where.push('al.entity_id = ?'); params.push(entity_id); }
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY al.created_at DESC LIMIT 100';
    const [logs] = await db.execute(query, params);
    return res.json({ success: true, logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/note', authenticate, async (req, res) => {
  const { entity_type, entity_id, note } = req.body;
  try {
    await db.execute(
      `INSERT INTO audit_logs (employee_id, action, category, entity_type, entity_id, details) VALUES (?, 'note', 'note', ?, ?, ?)`,
      [req.user.id, entity_type, entity_id, JSON.stringify({ note })]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
