import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { deleteProjectTree } from '../services/projectDeletion.js';

const router = Router();

const PROJECT_ACCESS = ['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];
const PROJECT_LINK_KINDS = new Set(['production','staging','figma','github','appstore','docs','prototype','other']);
const PROJECT_RESOURCE_KINDS = new Set(['brand','website','requirements','competitor','figma','drive','research','other']);

const normalizedKind = (value, allowed) => allowed.has(String(value || '').toLowerCase())
  ? String(value).toLowerCase()
  : 'other';

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

router.get('/:id', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  try {
    const [[project]] = await db.execute(
      `SELECT p.*, c.name AS client_name, c.company AS client_company, c.email AS client_email,
              e.name AS project_manager_name
       FROM projects p JOIN clients c ON c.id=p.client_id LEFT JOIN employees e ON e.id=p.project_manager_id
       WHERE p.id=?`, [req.params.id]
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const [requests] = await db.execute(
      `SELECT r.*, e.name AS assigned_to_name, dependency.title AS dependency_title
       FROM requests r LEFT JOIN employees e ON e.id=r.assigned_to
       LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id
       WHERE r.project_id=? ORDER BY FIELD(r.status,'revision','in_review','in_progress','queue','completed'), r.queue_position`, [project.id]
    );
    const [files] = await db.execute('SELECT * FROM files WHERE project_id=? ORDER BY created_at DESC', [project.id]);
    const [links] = await db.execute('SELECT * FROM project_links WHERE project_id=? ORDER BY id', [project.id]);
    const [resources] = await db.execute('SELECT * FROM project_resources WHERE project_id=? ORDER BY created_at DESC', [project.id]);
    const [activity] = await db.execute(
      `SELECT ra.*, r.title AS request_title FROM request_activity ra JOIN requests r ON r.id=ra.request_id
       WHERE r.project_id=? ORDER BY ra.created_at DESC LIMIT 50`, [project.id]
    );
    return res.json({ success: true, project, requests, files, links, resources, activity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  const { client_id, name, type, icon_emoji, status, notes, goal, audience, success_measure, project_manager_id, priority, start_date, due_date, estimated_hours, github_repo, staging_url, live_url, tech_stack } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO projects (client_id, name, type, icon_emoji, status, notes, goal, audience, success_measure, project_manager_id, priority, start_date, due_date, estimated_hours, github_repo, staging_url, live_url, tech_stack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, name, type || null, icon_emoji || null, status || 'active', notes || '', goal || null, audience || null, success_measure || null, project_manager_id || null, priority || 'normal', start_date || null, due_date || null, estimated_hours || null, github_repo || '', staging_url || '', live_url || '', tech_stack || '']
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
  const allowed = ['name','type','icon_emoji','status','notes','goal','audience','success_measure','project_manager_id','priority','progress_percent','start_date','due_date','estimated_hours','github_repo','staging_url','live_url','tech_stack','health_status'];
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

router.post('/:id/links', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  const { kind='other', label, url } = req.body;
  if (!label || !url) return res.status(400).json({ success:false, message:'Label and URL are required' });
  try {
    const [result] = await db.execute('INSERT INTO project_links (project_id, kind, label, url) VALUES (?, ?, ?, ?)', [req.params.id, normalizedKind(kind, PROJECT_LINK_KINDS), label, url]);
    const [[link]] = await db.execute('SELECT * FROM project_links WHERE id=?', [result.insertId]);
    return res.json({ success:true, link });
  } catch (err) { console.error(err); return res.status(500).json({success:false,message:'Server error'}); }
});

router.delete('/:id/links/:linkId', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  await db.execute('DELETE FROM project_links WHERE id=? AND project_id=?', [req.params.linkId, req.params.id]);
  return res.json({ success:true });
});

router.post('/:id/resources', authenticate, requireRoles(PROJECT_ACCESS), async (req, res) => {
  const { kind='other', title, url, file_url, file_name, notes } = req.body;
  if (!title) return res.status(400).json({ success:false, message:'Title is required' });
  try {
    const [[project]] = await db.execute('SELECT client_id FROM projects WHERE id=?', [req.params.id]);
    if (!project) return res.status(404).json({success:false,message:'Project not found'});
    const [result] = await db.execute('INSERT INTO project_resources (project_id, client_id, kind, title, url, file_url, file_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.params.id, project.client_id, normalizedKind(kind, PROJECT_RESOURCE_KINDS), title, url||null, file_url||null, file_name||null, notes||null]);
    const [[resource]] = await db.execute('SELECT * FROM project_resources WHERE id=?', [result.insertId]);
    return res.json({success:true,resource});
  } catch (err) { console.error(err); return res.status(500).json({success:false,message:'Server error'}); }
});

router.delete('/:id', authenticate, requireRoles(['owner','admin']), async (req, res) => {
  try {
    const project = await deleteProjectTree(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    try {
      await db.execute(
        `INSERT INTO audit_logs (employee_id, action, category, entity_type, entity_id, details)
         VALUES (?, 'delete_project', 'system', 'project', ?, ?)`,
        [req.user.id, project.id, JSON.stringify({ name: project.name, client_id: project.client_id })]
      );
    } catch (auditErr) {
      console.error('project deletion audit failed:', auditErr.message);
    }
    return res.json({ success: true, project: { id: project.id, name: project.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
