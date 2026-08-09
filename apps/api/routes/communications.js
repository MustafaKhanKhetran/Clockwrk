import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireOwner } from '../middleware/auth.js';
import { getClientMessageFeed, getCommunicationChannels } from '../services/clientMessageFeed.js';

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

router.get('/messages', authenticate, requireOwner, async (req, res) => {
  try {
    const channels = await getCommunicationChannels();
    const clientId = req.query.client_id ? Number(req.query.client_id) : null;
    if (!clientId) return res.json({ success: true, channels, messages: [] });
    const projectId = req.query.project_id ? Number(req.query.project_id) : null;
    const feed = await getClientMessageFeed({ clientId, projectId });
    if (!feed) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const messages = feed.messages.map((message) => ({
      ...message,
      client_name: feed.client.name,
      client_company: feed.client.company,
      client_email: feed.client.email,
    }));
    return res.json({ success: true, channels, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/messages', authenticate, requireOwner, async (req, res) => {
  const { client_id: clientId, project_id: requestedProjectId, content } = req.body;
  if (!clientId || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Client and message are required' });
  }
  try {
    const [[client]] = await db.execute('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    let projectId = null;
    if (requestedProjectId) {
      const [[project]] = await db.execute(
        'SELECT id FROM projects WHERE id = ? AND client_id = ?',
        [requestedProjectId, clientId]
      );
      if (!project) return res.status(400).json({ success: false, message: 'Project does not belong to this client' });
      projectId = project.id;
    }
    const [result] = await db.execute(
      "INSERT INTO client_messages (client_id, project_id, sender, content) VALUES (?, ?, 'team', ?)",
      [clientId, projectId, content.trim()]
    );
    const [[message]] = await db.execute(
      `SELECT m.id, m.client_id, m.project_id, m.sender, m.content, m.created_at,
              c.name AS client_name, c.company AS client_company, c.email AS client_email,
              p.name AS project_name
         FROM client_messages m
         JOIN clients c ON c.id = m.client_id
         LEFT JOIN projects p ON p.id = m.project_id
        WHERE m.id = ?`,
      [result.insertId]
    );
    message.attachments = [];
    message.event_type = 'chat';
    return res.status(201).json({ success: true, message });
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
