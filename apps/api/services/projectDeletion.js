import db from '../db.js';

const placeholdersFor = (values) => values.map(() => '?').join(', ');

/**
 * Permanently removes a project and dependent records that do not have cascade
 * foreign keys. clientId scopes portal deletions to the signed-in account.
 */
export async function deleteProjectTree(projectId, { clientId = null } = {}) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const params = [projectId];
    let query = 'SELECT id, name, client_id FROM projects WHERE id = ?';
    if (clientId !== null) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }
    query += ' FOR UPDATE';

    const [[project]] = await conn.execute(query, params);
    if (!project) {
      await conn.rollback();
      return null;
    }

    const [requestRows] = await conn.execute(
      'SELECT id FROM requests WHERE project_id = ?',
      [project.id]
    );
    const requestIds = requestRows.map((row) => row.id);

    if (requestIds.length) {
      const placeholders = placeholdersFor(requestIds);
      await conn.execute(
        `DELETE FROM files WHERE project_id = ? OR request_id IN (${placeholders})`,
        [project.id, ...requestIds]
      );
      await conn.execute(
        `DELETE FROM time_logs WHERE project_id = ? OR request_id IN (${placeholders})`,
        [project.id, ...requestIds]
      );
      await conn.execute(
        `DELETE FROM request_comments WHERE request_id IN (${placeholders})`,
        requestIds
      );
    } else {
      await conn.execute('DELETE FROM files WHERE project_id = ?', [project.id]);
      await conn.execute('DELETE FROM time_logs WHERE project_id = ?', [project.id]);
    }

    await conn.execute('DELETE FROM client_messages WHERE project_id = ?', [project.id]);
    await conn.execute(
      "DELETE FROM assignments WHERE entity_type = 'project' AND entity_id = ?",
      [project.id]
    );
    await conn.execute('DELETE FROM projects WHERE id = ?', [project.id]);

    await conn.commit();
    return project;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
