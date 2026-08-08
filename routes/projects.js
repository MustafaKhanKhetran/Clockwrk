import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

const PROJECT_ACCESS = ['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];

router.get('/', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  try {
    const { employee_id, status, client_id } = req.query;
    let query = `
      SELECT p.*, c.name AS client_name, c.company AS client_company, c.plan AS client_plan,
        COALESCE(e.name,
          (SELECT em.name FROM assignments a JOIN employees em ON em.id = a.employee_id
           WHERE a.entity_type='client' AND a.entity_id = p.client_id AND a.subtype='lead'
             AND em.role='project_manager' LIMIT 1)
        ) AS pm_name,
        (SELECT em.name FROM assignments a JOIN employees em ON em.id = a.employee_id
         WHERE a.entity_type='client' AND a.entity_id = p.client_id AND a.subtype='lead'
           AND em.role='account_manager' LIMIT 1) AS am_name,
        (SELECT COUNT(*) FROM requests r WHERE r.project_id = p.id AND r.status != 'completed' AND r.request_kind != 'parent') AS active_requests,
        (SELECT COUNT(*) FROM time_logs tl WHERE tl.project_id = p.id) AS total_logs
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN employees e ON e.id = p.project_manager_id
    `;
    const params = [];
    const where = [];
    if (status) { where.push('p.status = ?'); params.push(status); }
    if (client_id) { where.push('p.client_id = ?'); params.push(client_id); }
    if (employee_id) {
      where.push(`(p.project_manager_id = ? OR p.id IN (SELECT entity_id FROM assignments WHERE entity_type = 'project' AND employee_id = ?))`);
      params.push(employee_id, employee_id);
    }
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY p.created_at DESC';
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, projects: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  const { client_id, name, status, notes, project_manager_id, priority, start_date, due_date, estimated_hours, github_repo, staging_url, live_url, tech_stack } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO projects (client_id, name, status, notes, project_manager_id, priority, start_date, due_date, estimated_hours, github_repo, staging_url, live_url, tech_stack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, name, status || 'active', notes || '', project_manager_id || null, priority || 'normal', start_date || null, due_date || null, estimated_hours || null, github_repo || '', staging_url || '', live_url || '', tech_stack || '']
    );
    const [[project]] = await db.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    return res.json({ success: true, project });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name','status','notes','project_manager_id','priority','progress_percent','start_date','due_date','estimated_hours','github_repo','staging_url','live_url','tech_stack','health_status'];
  const fields = []; const params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
  }
  if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(id);
  try {
    await db.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, params);
    const [[project]] = await db.execute('SELECT * FROM projects WHERE id = ?', [id]);
    return res.json({ success: true, project });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireRoles(['owner','admin','head_of_delivery']), async (req, res) => {
  try {
    await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
