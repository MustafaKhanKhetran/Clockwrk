import db from '../db.js';
import { slotsFor } from './billingChanges.js';

const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

export async function addRequestActivity(executor, requestId, eventType, label, {
  actorType = 'system', actorId = null, metadata = null,
} = {}) {
  await executor.execute(
    `INSERT INTO request_activity (request_id, actor_type, actor_id, event_type, label, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [requestId, actorType, actorId, eventType, label, metadata ? JSON.stringify(metadata) : null]
  );
}

export async function nextQueuePosition(executor, clientId) {
  const [[row]] = await executor.execute(
    `SELECT COALESCE(MAX(queue_position), 0) + 1024 AS next_position
       FROM requests
      WHERE client_id = ? AND status = 'queue' AND request_kind != 'parent'`,
    [clientId]
  );
  return Number(row.next_position || 1024);
}

export async function loadBreakdown(executor, parentRequestId) {
  const [parts] = await executor.execute(
    `SELECT bp.id, bp.parent_request_id, bp.title, bp.description, bp.type, bp.priority,
            bp.position, bp.depends_on_part_id, bp.child_request_id,
            dependency.position AS depends_on_position
       FROM request_breakdown_parts bp
       LEFT JOIN request_breakdown_parts dependency ON dependency.id = bp.depends_on_part_id
      WHERE bp.parent_request_id = ?
      ORDER BY bp.position`,
    [parentRequestId]
  );
  return parts;
}

export async function saveBreakdownProposal({ parentRequestId, parts, employeeId, sendToClient = true }) {
  if (!Array.isArray(parts) || parts.length < 2 || parts.length > 50) {
    const error = new Error('A breakdown must contain between 2 and 50 parts.');
    error.status = 400;
    throw error;
  }
  const normalized = parts.map((part, index) => ({
    title: String(part.title || '').trim(),
    description: String(part.description || '').trim() || null,
    type: String(part.type || '').trim() || null,
    priority: PRIORITIES.has(String(part.priority || '').toLowerCase())
      ? String(part.priority).toLowerCase()
      : 'normal',
    position: index + 1,
    dependsOnPosition: Number(part.depends_on_position || part.dependsOnPosition || 0) || null,
  }));
  if (normalized.some((part) => !part.title)) {
    const error = new Error('Every breakdown part needs a title.');
    error.status = 400;
    throw error;
  }
  if (normalized.some((part) => part.dependsOnPosition && (
    part.dependsOnPosition < 1 || part.dependsOnPosition >= part.position
  ))) {
    const error = new Error('A part can only depend on an earlier part.');
    error.status = 400;
    throw error;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[parent]] = await conn.execute('SELECT * FROM requests WHERE id = ? FOR UPDATE', [parentRequestId]);
    if (!parent) { const error = new Error('Request not found.'); error.status = 404; throw error; }
    if (parent.request_kind === 'child') { const error = new Error('A child request cannot become a request group.'); error.status = 409; throw error; }
    if (parent.scope_status === 'approved') { const error = new Error('An approved breakdown cannot be replaced.'); error.status = 409; throw error; }
    if (!['queue'].includes(parent.status)) { const error = new Error('Only queued requests can be broken down.'); error.status = 409; throw error; }

    await conn.execute('DELETE FROM request_breakdown_parts WHERE parent_request_id = ?', [parent.id]);
    const idsByPosition = new Map();
    for (const part of normalized) {
      const [result] = await conn.execute(
        `INSERT INTO request_breakdown_parts
           (parent_request_id, title, description, type, priority, position, created_by_employee_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [parent.id, part.title, part.description, part.type, part.priority, part.position, employeeId]
      );
      idsByPosition.set(part.position, result.insertId);
    }
    for (const part of normalized) {
      if (!part.dependsOnPosition) continue;
      await conn.execute(
        'UPDATE request_breakdown_parts SET depends_on_part_id = ? WHERE id = ?',
        [idsByPosition.get(part.dependsOnPosition), idsByPosition.get(part.position)]
      );
    }
    await conn.execute(
      `UPDATE requests
          SET request_kind = 'parent', scope_status = ?, queue_position = NULL,
              assigned_to = NULL, updated_at = NOW()
        WHERE id = ?`,
      [sendToClient ? 'proposed' : 'reviewing', parent.id]
    );
    await addRequestActivity(conn, parent.id, sendToClient ? 'breakdown_proposed' : 'breakdown_draft_saved', `${sendToClient ? 'Breakdown proposed' : 'Breakdown draft saved'} · ${normalized.length} parts`, {
      actorType: 'employee', actorId: employeeId, metadata: { part_count: normalized.length },
    });
    await conn.commit();
    return { parentId: parent.id, parts: await loadBreakdown(db, parent.id) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function sendBreakdownToClient({ parentRequestId, employeeId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[parent]] = await conn.execute('SELECT * FROM requests WHERE id=? FOR UPDATE', [parentRequestId]);
    if (!parent) { const error=new Error('Request not found.'); error.status=404; throw error; }
    if (parent.request_kind !== 'parent' || parent.scope_status !== 'reviewing') { const error=new Error('Save a valid breakdown draft before sending it.'); error.status=409; throw error; }
    const [[{ count }]] = await conn.execute('SELECT COUNT(*) AS count FROM request_breakdown_parts WHERE parent_request_id=?', [parent.id]);
    if (Number(count) < 2) { const error=new Error('A breakdown needs at least two parts.'); error.status=409; throw error; }
    await conn.execute("UPDATE requests SET scope_status='proposed', updated_at=NOW() WHERE id=?", [parent.id]);
    await addRequestActivity(conn, parent.id, 'breakdown_proposed', `Breakdown sent to client · ${count} parts`, { actorType:'employee', actorId:employeeId });
    await conn.execute(`INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Breakdown sent to client',?,?)`, [`${parent.title} is awaiting client approval.`, `/requests/${parent.id}`]);
    await conn.commit();
    return Number(count);
  } catch(error) { await conn.rollback(); throw error; } finally { conn.release(); }
}

export async function markScopeReview({ requestId, employeeId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[request]] = await conn.execute('SELECT * FROM requests WHERE id = ? FOR UPDATE', [requestId]);
    if (!request) { const error = new Error('Request not found.'); error.status = 404; throw error; }
    if (request.request_kind === 'child' || request.status !== 'queue') {
      const error = new Error('Only a queued normal request can enter scope review.'); error.status = 409; throw error;
    }
    await conn.execute(
      "UPDATE requests SET request_kind = 'parent', scope_status = 'reviewing', queue_position = NULL WHERE id = ?",
      [request.id]
    );
    await addRequestActivity(conn, request.id, 'scope_review_started', 'Scope review started', {
      actorType: 'employee', actorId: employeeId,
    });
    await conn.commit();
    return request.id;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function returnToNormalQueue({ requestId, employeeId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[request]] = await conn.execute('SELECT * FROM requests WHERE id = ? FOR UPDATE', [requestId]);
    if (!request) { const error = new Error('Request not found.'); error.status = 404; throw error; }
    if (request.scope_status === 'approved') { const error = new Error('An approved request group cannot be converted.'); error.status = 409; throw error; }
    await conn.execute('DELETE FROM request_breakdown_parts WHERE parent_request_id = ?', [request.id]);
    const position = await nextQueuePosition(conn, request.client_id);
    await conn.execute(
      "UPDATE requests SET request_kind = 'normal', scope_status = 'none', queue_position = ? WHERE id = ?",
      [position, request.id]
    );
    await addRequestActivity(conn, request.id, 'scope_review_completed', 'Scope review completed · ready in queue', {
      actorType: 'employee', actorId: employeeId,
    });
    await conn.commit();
    return request.id;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function approveBreakdown({ parentRequestId, clientId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[parent]] = await conn.execute(
      'SELECT * FROM requests WHERE id = ? AND client_id = ? FOR UPDATE',
      [parentRequestId, clientId]
    );
    if (!parent) { const error = new Error('Request not found.'); error.status = 404; throw error; }
    if (parent.request_kind !== 'parent') { const error = new Error('This request does not have a breakdown.'); error.status = 409; throw error; }

    const [existingChildren] = await conn.execute(
      'SELECT * FROM requests WHERE parent_request_id = ? ORDER BY part_number',
      [parent.id]
    );
    if (parent.scope_status === 'approved') {
      await conn.commit();
      return { parent, children: existingChildren, alreadyApproved: true };
    }
    if (parent.scope_status !== 'proposed') { const error = new Error('The breakdown is not ready for approval.'); error.status = 409; throw error; }

    await conn.execute('SELECT id FROM clients WHERE id = ? FOR UPDATE', [clientId]);

    const [parts] = await conn.execute(
      'SELECT * FROM request_breakdown_parts WHERE parent_request_id = ? ORDER BY position FOR UPDATE',
      [parent.id]
    );
    if (parts.length < 2) { const error = new Error('The proposed breakdown is incomplete.'); error.status = 409; throw error; }

    let position = await nextQueuePosition(conn, clientId);
    const childByPart = new Map();
    for (const part of parts) {
      const [result] = await conn.execute(
        `INSERT INTO requests
           (project_id, client_id, title, description, type, status, priority, approval_status,
            request_kind, parent_request_id, scope_status, queue_position, part_number)
         VALUES (?, ?, ?, ?, ?, 'queue', ?, 'pending', 'child', ?, 'approved', ?, ?)`,
        [parent.project_id, parent.client_id, part.title, part.description || parent.description,
          part.type || parent.type, part.priority, parent.id, position, part.position]
      );
      childByPart.set(part.id, result.insertId);
      await conn.execute('UPDATE request_breakdown_parts SET child_request_id = ? WHERE id = ?', [result.insertId, part.id]);
      await addRequestActivity(conn, result.insertId, 'request_created', `Part ${part.position} created from ${parent.title}`, {
        metadata: { parent_request_id: parent.id, part_number: part.position, part_count: parts.length },
      });
      position += 1024;
    }
    for (const part of parts) {
      if (!part.depends_on_part_id) continue;
      await conn.execute(
        'UPDATE requests SET depends_on_request_id = ? WHERE id = ?',
        [childByPart.get(part.depends_on_part_id), childByPart.get(part.id)]
      );
    }
    await conn.execute(
      `UPDATE requests
          SET scope_status = 'approved', breakdown_approved_at = NOW(),
              breakdown_approved_by_client_id = ?, updated_at = NOW()
        WHERE id = ?`,
      [clientId, parent.id]
    );
    await addRequestActivity(conn, parent.id, 'breakdown_approved', `Breakdown approved · ${parts.length} linked requests created`, {
      actorType: 'client', actorId: clientId, metadata: { part_count: parts.length },
    });
    await conn.commit();
    return {
      parent: { ...parent, scope_status: 'approved' },
      children: parts.map((part) => ({ id: childByPart.get(part.id), title: part.title, part_number: part.position })),
      alreadyApproved: false,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function reorderClientQueue({ clientId, orderedIds }) {
  const ids = [...new Set((orderedIds || []).map(Number).filter(Number.isInteger))];
  if (!ids.length) { const error = new Error('ordered_ids required.'); error.status = 400; throw error; }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT id FROM requests
        WHERE client_id = ? AND status = 'queue' AND request_kind != 'parent'
        ORDER BY COALESCE(queue_position, 9223372036854775807), created_at, id
        FOR UPDATE`,
      [clientId]
    );
    const available = new Set(rows.map((row) => Number(row.id)));
    if (rows.length !== ids.length || ids.some((id) => !available.has(id))) {
      const error = new Error('The queue changed. Refresh before reordering.'); error.status = 409; throw error;
    }
    for (let index = 0; index < ids.length; index += 1) {
      await conn.execute('UPDATE requests SET queue_position = ? WHERE id = ?', [(index + 1) * 1024, ids[index]]);
    }
    await conn.commit();
    return ids;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function promoteNextQueued(clientId) {
  const slots = await slotsFor(clientId);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM clients WHERE id = ? FOR UPDATE', [clientId]);
    const [[{ active }]] = await conn.execute(
      `SELECT COUNT(*) AS active FROM requests
        WHERE client_id = ? AND request_kind != 'parent' AND status IN ('in_progress','revision')`,
      [clientId]
    );
    if (Number(active) >= slots) { await conn.commit(); return null; }
    const [[next]] = await conn.execute(
      `SELECT r.id, r.title
         FROM requests r
         LEFT JOIN requests dependency ON dependency.id = r.depends_on_request_id
        WHERE r.client_id = ?
          AND r.request_kind != 'parent'
          AND r.status = 'queue'
          AND r.scope_status IN ('none','approved')
          AND (r.depends_on_request_id IS NULL OR dependency.status = 'completed')
        ORDER BY COALESCE(r.queue_position, 9223372036854775807), r.created_at, r.id
        LIMIT 1 FOR UPDATE`,
      [clientId]
    );
    if (!next) { await conn.commit(); return null; }
    await conn.execute("UPDATE requests SET status = 'in_progress', updated_at = NOW() WHERE id = ?", [next.id]);
    await addRequestActivity(conn, next.id, 'request_started', 'Production started');
    await conn.commit();
    return next;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
