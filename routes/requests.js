import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  addRequestActivity,
  loadBreakdown,
  markScopeReview,
  nextQueuePosition,
  returnToNormalQueue,
  saveBreakdownProposal,
} from '../services/requestWorkflow.js';

const router = Router();

const REQUEST_ACCESS = ['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];

router.get('/', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    const { employee_id, project_id, client_id, status } = req.query;
    let query = `
      SELECT r.*, c.name AS client_name, c.company AS client_company,
        p.name AS project_name, e.name AS assigned_to_name,
        parent.title AS parent_title, dependency.title AS dependency_title,
        (SELECT COUNT(*) FROM requests child WHERE child.parent_request_id = r.id) AS child_count,
        (SELECT COUNT(*) FROM request_breakdown_parts bp WHERE bp.parent_request_id = r.id) AS proposed_part_count,
        (SELECT COUNT(*) FROM request_comments rc WHERE rc.request_id = r.id) AS comment_count
      FROM requests r
      LEFT JOIN clients c ON c.id = r.client_id
      LEFT JOIN projects p ON p.id = r.project_id
      LEFT JOIN employees e ON e.id = r.assigned_to
      LEFT JOIN requests parent ON parent.id = r.parent_request_id
      LEFT JOIN requests dependency ON dependency.id = r.depends_on_request_id
    `;
    const params = []; const where = [];
    if (status) { where.push('r.status = ?'); params.push(status); }
    if (client_id) { where.push('r.client_id = ?'); params.push(client_id); }
    if (project_id) { where.push('r.project_id = ?'); params.push(project_id); }
    if (employee_id) {
      where.push(`(r.assigned_to = ? OR r.id IN (SELECT entity_id FROM assignments WHERE entity_type = 'request' AND employee_id = ? AND subtype = 'collaborator'))`);
      params.push(employee_id, employee_id);
    }
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ` ORDER BY
      CASE r.request_kind WHEN 'parent' THEN 0 WHEN 'child' THEN 1 ELSE 2 END,
      COALESCE(r.parent_request_id, r.id), COALESCE(r.part_number, 0),
      COALESCE(r.queue_position, 9223372036854775807), r.created_at DESC`;
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  const { project_id, client_id, assigned_to, title, description, type, status, priority, due_date, estimated_hours } = req.body;
  const conn = await db.getConnection();
  try {
    if (!client_id) return res.status(400).json({ success: false, message: 'client_id is required' });
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM clients WHERE id = ? FOR UPDATE', [client_id]);
    const requestStatus = status || 'queue';
    const queuePosition = requestStatus === 'queue' ? await nextQueuePosition(conn, client_id) : null;
    const [result] = await conn.execute(
      `INSERT INTO requests
         (project_id, client_id, assigned_to, title, description, type, status, priority,
          due_date, estimated_hours, request_kind, scope_status, queue_position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', 'none', ?, NOW(), NOW())`,
      [project_id || null, client_id, assigned_to || null, title, description || '', type || '', requestStatus, priority || 'normal', due_date || null, estimated_hours || null, queuePosition]
    );
    await addRequestActivity(conn, result.insertId, 'request_created', 'Request created by the Clockwrk team', {
      actorType: 'employee', actorId: req.user.id,
    });
    const [[request]] = await conn.execute('SELECT * FROM requests WHERE id = ?', [result.insertId]);
    await conn.commit();
    return res.json({ success: true, request });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

router.get('/:id/breakdown', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    const [[request]] = await db.execute('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const parts = await loadBreakdown(db, request.id);
    const [children] = await db.execute(
      `SELECT id, title, status, priority, part_number, depends_on_request_id, queue_position
         FROM requests WHERE parent_request_id = ? ORDER BY part_number`,
      [request.id]
    );
    return res.json({ success: true, request, parts, children });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/scope/start', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    await markScopeReview({ requestId: Number(req.params.id), employeeId: req.user.id });
    const [[request]] = await db.execute('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    return res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.post('/:id/scope/normal', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    await returnToNormalQueue({ requestId: Number(req.params.id), employeeId: req.user.id });
    const [[request]] = await db.execute('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    return res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.put('/:id/breakdown', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    const result = await saveBreakdownProposal({
      parentRequestId: Number(req.params.id),
      parts: req.body.parts,
      employeeId: req.user.id,
    });
    const [[request]] = await db.execute('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link)
       VALUES ('system', 'Breakdown ready for client review', ?, ?)`,
      [`${request.title} was split into ${result.parts.length} proposed parts.`, `/requests/${request.id}`]
    );
    return res.json({ success: true, request, parts: result.parts });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.patch('/:id', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  const { id } = req.params;
  const allowed = ['title','description','type','status','priority','assigned_to','due_date','estimated_hours','completion_percent','revision_notes','delivery_files','approval_status'];
  const fields = []; const params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
  }
  if (req.body.status === 'completed') { fields.push('completed_at = NOW()'); }
  fields.push('updated_at = NOW()');
  params.push(id);
  try {
    const [[existing]] = await db.execute('SELECT * FROM requests WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.request_kind === 'parent' && req.body.status && req.body.status !== existing.status) {
      return res.status(409).json({ success: false, message: 'A request group status is controlled by its parts.' });
    }
    await db.execute(`UPDATE requests SET ${fields.join(', ')} WHERE id = ?`, params);
    if (req.body.status && req.body.status !== existing.status) {
      await addRequestActivity(db, Number(id), 'status_changed', `Status changed to ${req.body.status.replaceAll('_', ' ')}`, {
        actorType: 'employee', actorId: req.user.id, metadata: { from: existing.status, to: req.body.status },
      });
    }
    const [[request]] = await db.execute('SELECT * FROM requests WHERE id = ?', [id]);
    return res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Comments
router.get('/:id/comments', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  try {
    const [comments] = await db.execute(
      `SELECT rc.*, e.name AS author_name, e.role AS author_role
       FROM request_comments rc
       LEFT JOIN employees e ON e.id = rc.employee_id
       WHERE rc.request_id = ? ORDER BY rc.created_at ASC`,
      [req.params.id]
    );
    return res.json({ success: true, comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/comments', authenticate, requireRoles(REQUEST_ACCESS), async (req, res) => {
  const { comment, visibility } = req.body;
  try {
    await db.execute(
      `INSERT INTO request_comments (request_id, employee_id, comment, visibility) VALUES (?, ?, ?, ?)`,
      [req.params.id, req.user.id, comment, visibility || 'internal']
    );
    await addRequestActivity(db, Number(req.params.id), 'team_comment', visibility === 'client' ? 'Team replied to the client' : 'Internal note added', {
      actorType: 'employee', actorId: req.user.id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
