import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const TIME_ACCESS = ['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];

router.get('/', authenticate, requireRoles(TIME_ACCESS), async (req, res) => {
  try {
    const { employee_id, project_id } = req.query;
    let query = `
      SELECT t.*, e.name AS employee_name, p.name AS project_name, r.title AS request_title, c.name AS client_name
      FROM time_logs t
      LEFT JOIN employees e ON e.id = t.employee_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN requests r ON r.id = t.request_id
      LEFT JOIN clients c ON c.id = p.client_id
    `;
    const params = []; const where = [];
    if (employee_id) { where.push('t.employee_id = ?'); params.push(employee_id); }
    if (project_id) { where.push('t.project_id = ?'); params.push(project_id); }
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY t.log_date DESC, t.created_at DESC';
    const [logs] = await db.execute(query, params);
    return res.json({ success: true, logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, requireRoles(TIME_ACCESS), async (req, res) => {
  const { request_id, project_id, employee_id, hours, description, log_date } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO time_logs (request_id, project_id, employee_id, hours, description, log_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [request_id || null, project_id || null, ['owner','admin'].includes(req.user.role) && employee_id ? employee_id : req.user.id, hours, description || '', log_date || new Date().toISOString().slice(0, 10)]
    );
    const [[log]] = await db.execute('SELECT * FROM time_logs WHERE id = ?', [result.insertId]);
    return res.json({ success: true, log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id', authenticate, requireRoles(TIME_ACCESS), async (req, res) => {
  try {
    const [[existing]] = await db.execute('SELECT * FROM time_logs WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({success:false,message:'Time entry not found'});
    if (!['owner','admin'].includes(req.user.role) && Number(existing.employee_id) !== Number(req.user.id)) return res.status(403).json({success:false,message:'You can only edit your own time entries'});
    const allowed=['request_id','project_id','hours','description','log_date']; const fields=[]; const params=[];
    for (const key of allowed) if (req.body[key] !== undefined) { fields.push(`${key}=?`); params.push(req.body[key] || null); }
    if (!fields.length) return res.status(400).json({success:false,message:'No fields to update'});
    params.push(req.params.id); await db.execute(`UPDATE time_logs SET ${fields.join(',')} WHERE id=?`, params);
    const [[log]] = await db.execute('SELECT * FROM time_logs WHERE id=?', [req.params.id]);
    return res.json({success:true,log});
  } catch(err) { console.error(err); return res.status(500).json({success:false,message:'Server error'}); }
});

router.delete('/:id', authenticate, requireRoles(TIME_ACCESS), async (req, res) => {
  try {
    const [[existing]] = await db.execute('SELECT employee_id FROM time_logs WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({success:false,message:'Time entry not found'});
    if (!['owner','admin'].includes(req.user.role) && Number(existing.employee_id) !== Number(req.user.id)) return res.status(403).json({success:false,message:'You can only delete your own time entries'});
    await db.execute('DELETE FROM time_logs WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
