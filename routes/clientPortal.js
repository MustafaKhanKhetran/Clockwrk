import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import https from 'https';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import db from '../db.js';
import {
  ADDONS, PLANS, applyChange, expiryFor, paymentRef, quote, slotsFor, sweepChanges,
} from '../services/billingChanges.js';
import {
  addRequestActivity,
  approveBreakdown,
  loadBreakdown,
  nextQueuePosition,
  promoteNextQueued,
  reorderClientQueue,
} from '../services/requestWorkflow.js';

const router = Router();

// R2 upload, same configuration as routes/files.js.
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({ rejectUnauthorized: false, secureOptions: 0x4, ciphers: 'ALL' }),
  }),
});
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC = process.env.R2_PUBLIC_URL || 'https://files.clockwrk.io';
const safeKey = (k) => k.replace(/[^a-zA-Z0-9._\-/]/g, '_');
const clientUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/zip', 'application/x-zip-compressed',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('That file type is not supported.'));
  },
}).single('file');

// Strict limiter for credential endpoints only. The router as a whole is on a
// much looser limiter (server.js) because normal portal use is chatty.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Client Auth Middleware ───────────────────────────────────────────────────
function clientAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.type !== 'client') return res.status(403).json({ success: false, message: 'Client token required' });
    req.client = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ─── POST /api/client/login ───────────────────────────────────────────────────
router.post('/login', credentialLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    const [[client]] = await db.execute(
      `SELECT id, name, email, phone, company, plan, billing, status, password_hash, subscribed_at,
              portal_onboarding_version, onboarding_completed_at
         FROM clients WHERE email = ?`,
      [email]
    );
    if (!client) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (client.status !== 'active') return res.status(403).json({ success: false, message: 'Account is not active' });
    if (!client.password_hash) return res.status(403).json({ success: false, message: 'Portal access not set up. Contact Clockwrk.' });

    const valid = await bcrypt.compare(password, client.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { type: 'client', id: client.id, email: client.email, name: client.name, company: client.company, plan: client.plan },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password_hash, ...safeClient } = client;
    return res.json({ success: true, token, client: safeClient });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/me ───────────────────────────────────────────────────────
router.get('/me', clientAuth, async (req, res) => {
  try {
    const [[client]] = await db.execute(
      `SELECT id, name, email, phone, company, plan, billing, status, subscribed_at,
              next_payment_due, last_payment_date, notify_prefs,
              portal_onboarding_version, onboarding_completed_at
         FROM clients WHERE id = ?`,
      [req.client.id]
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    return res.json({ success: true, client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep a version rather than a boolean so a future materially different tour
// can be offered without resetting or guessing from browser storage.
router.put('/onboarding', clientAuth, async (req, res) => {
  const version = Math.max(0, Math.min(100, Number(req.body?.version) || 0));
  try {
    await db.execute(
      `UPDATE clients
          SET portal_onboarding_version = GREATEST(portal_onboarding_version, ?),
              onboarding_completed_at = CASE WHEN ? > 0 THEN NOW() ELSE onboarding_completed_at END
        WHERE id = ?`,
      [version, version, req.client.id]
    );
    const [[client]] = await db.execute('SELECT portal_onboarding_version FROM clients WHERE id = ?', [req.client.id]);
    return res.json({ success: true, portal_onboarding_version: Number(client?.portal_onboarding_version || version) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/client/me ─────────────────────────────────────────────────────
router.patch('/me', clientAuth, async (req, res) => {
  const { name, phone, company } = req.body;
  try {
    await db.execute(
      'UPDATE clients SET name = COALESCE(?, name), phone = COALESCE(?, phone), company = COALESCE(?, company) WHERE id = ?',
      [name || null, phone || null, company || null, req.client.id]
    );
    const [[client]] = await db.execute(
      'SELECT id, name, email, phone, company, plan, billing, status, subscribed_at FROM clients WHERE id = ?',
      [req.client.id]
    );
    return res.json({ success: true, client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/change-password ────────────────────────────────────────
router.post('/change-password', credentialLimiter, clientAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ success: false, message: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  try {
    const [[client]] = await db.execute('SELECT password_hash FROM clients WHERE id = ?', [req.client.id]);
    const valid = await bcrypt.compare(current_password, client.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE clients SET password_hash = ? WHERE id = ?', [hash, req.client.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/dashboard ────────────────────────────────────────────────
router.get('/dashboard', clientAuth, async (req, res) => {
  try {
    const [[{ active_projects }]] = await db.execute(
      "SELECT COUNT(*) AS active_projects FROM projects WHERE client_id = ? AND status = 'active'",
      [req.client.id]
    );
    const [[{ open_tickets }]] = await db.execute(
      "SELECT COUNT(*) AS open_tickets FROM client_tickets WHERE client_id = ? AND status IN ('Open','In Progress')",
      [req.client.id]
    );
    const [[invoiceStats]] = await db.execute(
      "SELECT COUNT(*) AS unpaid_count, COALESCE(SUM(amount),0) AS unpaid_total FROM payments WHERE email = ? AND status = 'pending'",
      [req.client.email]
    );
    const [[lastPayment]] = await db.execute(
      "SELECT amount, confirmed_at FROM payments WHERE email = ? AND status = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1",
      [req.client.email]
    );
    const [recentProjects] = await db.execute(
      'SELECT id, name, status, created_at FROM projects WHERE client_id = ? ORDER BY created_at DESC LIMIT 3',
      [req.client.id]
    );
    const [recentInvoices] = await db.execute(
      'SELECT id, amount, status, submitted_at FROM payments WHERE email = ? ORDER BY submitted_at DESC LIMIT 3',
      [req.client.email]
    );
    return res.json({
      success: true,
      stats: {
        active_projects,
        open_tickets,
        unpaid_count: invoiceStats.unpaid_count,
        unpaid_total: invoiceStats.unpaid_total,
        last_payment_amount: lastPayment?.amount || null,
        last_payment_date: lastPayment?.confirmed_at || null,
      },
      recent_projects: recentProjects,
      recent_invoices: recentInvoices,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// A project without a logo still needs a visual anchor, so fall back to an emoji
// picked from its type. Deterministic per project id, so it never changes.
const TYPE_EMOJI = {
  'Website': ['🌐', '🖥️', '🧭'],
  'Web app': ['⚙️', '🧩', '🛠️'],
  'Mobile app': ['📱', '🚀', '🧿'],
  'E-commerce': ['🛒', '🏷️', '📦'],
  'Brand identity': ['🎨', '✨', '🪄'],
  'Design system': ['🧱', '📐', '🎛️'],
  'Marketing campaign': ['📣', '🎯', '📈'],
  'Content': ['✍️', '📝', '📚'],
  'Pitch deck': ['📊', '🎤', '💼'],
  'Product launch': ['🚀', '🎉', '🧨'],
  'SaaS platform': ['☁️', '🔗', '⚡'],
  'Internal tool': ['🔧', '🗂️', '🧮'],
  'Research': ['🔬', '🧪', '🔎'],
  'Other': ['📁', '🗃️', '🧷'],
};

function emojiFor(type, id) {
  const set = TYPE_EMOJI[type] || TYPE_EMOJI.Other;
  return set[Number(id || 0) % set.length];
}

function toPortalProject(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'Other',
    icon: row.icon_emoji || emojiFor(row.type, row.id),
    logoUrl: row.logo_url || null,
    status: row.status,
    description: row.description,
    tagline: row.description,
    goal: row.goal,
    audience: row.audience,
    successMeasure: row.success_measure,
    progress: row.progress_percent ?? 0,
    startedAt: row.start_date,
    targetAt: row.due_date,
    stack: (row.tech_stack || '').split(/[,/]/).map((x) => x.trim()).filter(Boolean),
    pm: null,
    am: null,
    members: [],
    createdAt: row.created_at,
  };
}

// ─── GET /api/client/projects ─────────────────────────────────────────────────
router.get('/projects', clientAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, type, icon_emoji, logo_url, status, notes AS description, goal,
              audience, success_measure, progress_percent, start_date, due_date,
              live_url, staging_url, tech_stack, created_at
         FROM projects WHERE client_id = ? ORDER BY created_at DESC`,
      [req.client.id]
    );
    // Shape it the way the portal renders projects, so the UI never has to guess
    // which fields exist. tech_stack is a free-text column, not JSON.
    const projects = rows.map(toPortalProject);
    return res.json({ success: true, projects });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/invoices ─────────────────────────────────────────────────
router.get('/invoices', clientAuth, async (req, res) => {
  try {
    const [invoices] = await db.execute(
      'SELECT id, plan, billing, amount, fee_usd, received_usd, status, submitted_at, confirmed_at FROM payments WHERE email = ? ORDER BY submitted_at DESC',
      [req.client.email]
    );
    const [[{ total_paid }]] = await db.execute(
      "SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE email = ? AND status = 'confirmed'",
      [req.client.email]
    );
    const [[{ total_pending }]] = await db.execute(
      "SELECT COALESCE(SUM(amount),0) AS total_pending FROM payments WHERE email = ? AND status = 'pending'",
      [req.client.email]
    );
    return res.json({ success: true, invoices, total_paid, total_pending });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/tickets ──────────────────────────────────────────────────
router.get('/tickets', clientAuth, async (req, res) => {
  try {
    const [tickets] = await db.execute(
      'SELECT id, subject, category, priority, status, created_at, updated_at FROM client_tickets WHERE client_id = ? ORDER BY created_at DESC',
      [req.client.id]
    );
    return res.json({ success: true, tickets });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/tickets ─────────────────────────────────────────────────
router.post('/tickets', clientAuth, async (req, res) => {
  const { subject, category, priority, description } = req.body;
  if (!subject || !category || !description) return res.status(400).json({ success: false, message: 'subject, category, description required' });
  try {
    const [result] = await db.execute(
      'INSERT INTO client_tickets (client_id, subject, category, priority, description) VALUES (?, ?, ?, ?, ?)',
      [req.client.id, subject, category, priority || 'Normal', description]
    );
    // Notifying the team must never fail the client's ticket — it is already
    // saved at this point. Log and move on if the alert insert fails.
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('support', 'New client ticket', ?, '/clients')",
        [`${req.client.name} opened: ${subject}`]
      );
    } catch (alertErr) {
      console.error('ticket alert failed:', alertErr.message);
    }
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/tickets/:id ─────────────────────────────────────────────
router.get('/tickets/:id', clientAuth, async (req, res) => {
  try {
    const [[ticket]] = await db.execute(
      'SELECT * FROM client_tickets WHERE id = ? AND client_id = ?',
      [req.params.id, req.client.id]
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const [replies] = await db.execute(
      'SELECT * FROM client_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    return res.json({ success: true, ticket, replies });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/tickets/:id/reply ──────────────────────────────────────
router.post('/tickets/:id/reply', clientAuth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'message required' });
  try {
    const [[ticket]] = await db.execute(
      'SELECT id FROM client_tickets WHERE id = ? AND client_id = ?',
      [req.params.id, req.client.id]
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await db.execute(
      "INSERT INTO client_ticket_replies (ticket_id, sender, message) VALUES (?, 'client', ?)",
      [req.params.id, message]
    );
    await db.execute(
      "UPDATE client_tickets SET status = 'Open', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('support', 'Client replied to a ticket', ?, '/clients')",
        [`${req.client.name}: ${message.slice(0, 110)}`]
      );
    } catch (alertErr) { console.error('ticket reply alert failed:', alertErr.message); }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/files ────────────────────────────────────────────────────
router.get('/files', clientAuth, async (req, res) => {
  try {
    const [files] = await db.execute(
      `SELECT f.id, f.file_name AS name, f.file_url, f.file_type, f.category, f.created_at, p.name AS project_name
       FROM files f
       LEFT JOIN projects p ON p.id = f.project_id
       WHERE p.client_id = ? OR f.client_id = ?
       ORDER BY f.created_at DESC`,
      [req.client.id, req.client.id]
    );
    return res.json({ success: true, files });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/client/messages ─────────────────────────────────────────────────
router.get('/messages', clientAuth, async (req, res) => {
  const projectId = req.query.project_id ? Number(req.query.project_id) : null;
  try {
    // Messages predating project threads have a NULL project_id; show them in
    // every thread rather than hiding history.
    const [messages] = projectId
      ? await db.execute(
          `SELECT id, project_id, sender, content, created_at
             FROM client_messages
            WHERE client_id = ? AND (project_id = ? OR project_id IS NULL)
            ORDER BY created_at ASC`,
          [req.client.id, projectId]
        )
      : await db.execute(
          `SELECT id, project_id, sender, content, created_at
             FROM client_messages
            WHERE client_id = ? ORDER BY created_at ASC`,
          [req.client.id]
        );
    return res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/messages ────────────────────────────────────────────────
router.post('/messages', clientAuth, async (req, res) => {
  const { content, project_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, message: 'content required' });
  try {
    // A thread can only be opened against a project the client owns.
    let projectId = null;
    if (project_id) {
      const [[project]] = await db.execute(
        'SELECT id FROM projects WHERE id = ? AND client_id = ?',
        [project_id, req.client.id]
      );
      if (!project) return res.status(403).json({ success: false, message: 'Project not found for this account' });
      projectId = project.id;
    }
    const [result] = await db.execute(
      "INSERT INTO client_messages (client_id, project_id, sender, content) VALUES (?, ?, 'client', ?)",
      [req.client.id, projectId, content.trim()]
    );
    const [[msg]] = await db.execute('SELECT * FROM client_messages WHERE id = ?', [result.insertId]);
    // Surface it on the team dashboard so a client message is not missed.
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('message', 'New client message', ?, '/clients')",
        [`${req.client.name}: ${content.trim().slice(0, 120)}`]
      );
    } catch (alertErr) {
      console.error('message alert failed:', alertErr.message);
    }
    return res.json({ success: true, message: msg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Requests ─────────────────────────────────────────────────────────────────
// The portal speaks a different status vocabulary to the DB enum. Map at this
// boundary so the client app never has to know about the internal names.
const STATUS_TO_PORTAL = {
  queue: 'queued',
  in_progress: 'active',
  in_review: 'review',
  revision: 'active',
  completed: 'done',
};

const FILE_KIND = {
  'application/pdf': 'pdf', pdf: 'pdf', figma: 'figma', zip: 'zip', html: 'html',
  code: 'code', svg: 'svg', png: 'png', jpg: 'img', jpeg: 'img', mp4: 'video',
};

function fileKind(row) {
  const ext = (row.file_name || '').split('.').pop()?.toLowerCase();
  return FILE_KIND[row.file_type] || FILE_KIND[ext] || 'file';
}

// The portal renders `due` and file dates as plain strings, so format here
// rather than leaking raw ISO timestamps into the UI.
function shortDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function derivedParentStatus(row, children) {
  if (row.scope_status === 'reviewing' || row.scope_status === 'proposed') return 'scope';
  if (!children.length) return 'queued';
  if (children.every((child) => child.status === 'completed')) return 'done';
  if (children.some((child) => child.status === 'in_review')) return 'review';
  if (children.some((child) => ['in_progress', 'revision'].includes(child.status))) return 'active';
  return 'queued';
}

function toPortalRequest(row, {
  comments = [], deliverables = [], activities = [], children = [], breakdown = [],
} = {}) {
  const isParent = row.request_kind === 'parent';
  const status = isParent ? derivedParentStatus(row, children) : (STATUS_TO_PORTAL[row.status] || 'queued');
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    brief: row.description,
    type: row.type,
    status,
    dbStatus: row.status,
    requestKind: row.request_kind || 'normal',
    isParent,
    isChild: row.request_kind === 'child',
    parentRequestId: row.parent_request_id,
    parentTitle: row.parent_title,
    scopeStatus: row.scope_status || 'none',
    scopeActionRequired: isParent && row.scope_status === 'proposed',
    partNumber: row.part_number,
    partCount: isParent ? children.length || breakdown.length : Number(row.part_count || 0),
    dependsOnRequestId: row.depends_on_request_id,
    dependsOnTitle: row.depends_on_title,
    dependencyComplete: !row.depends_on_request_id || row.depends_on_status === 'completed',
    breakdownApprovedAt: row.breakdown_approved_at,
    priority: row.priority ? row.priority[0].toUpperCase() + row.priority.slice(1) : 'Normal',
    progress: row.completion_percent ?? 0,
    due: shortDate(row.due_date),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    approvalStatus: row.approval_status,
    // The portal renders these unconditionally (`request.deliverables.length`),
    // so they must always be arrays, never undefined.
    comments,
    deliverables,
    timeline: activities.map((item, index) => ({
      label: item.label,
      at: shortDate(item.created_at) || 'Just now',
      done: index > 0,
      now: index === 0,
      eventType: item.event_type,
    })),
    changelog: [],
    revisionsUsed: activities.filter((item) => item.event_type === 'revision_requested').length,
    children: children.map((child) => ({
      id: child.id,
      title: child.title,
      status: STATUS_TO_PORTAL[child.status] || 'queued',
      dbStatus: child.status,
      partNumber: child.part_number,
      dependsOnRequestId: child.depends_on_request_id,
    })),
    breakdown: breakdown.map((part) => ({
      id: part.id,
      title: part.title,
      description: part.description,
      type: part.type,
      priority: part.priority,
      position: part.position,
      dependsOnPosition: part.depends_on_position,
      childRequestId: part.child_request_id,
    })),
  };
}

// ─── GET /api/client/requests ─────────────────────────────────────────────────
router.get('/requests', clientAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.*, p.name AS project_name, parent.title AS parent_title,
              dependency.title AS depends_on_title, dependency.status AS depends_on_status,
              (SELECT COUNT(*) FROM requests siblings WHERE siblings.parent_request_id = r.parent_request_id) AS part_count
         FROM requests r
         LEFT JOIN projects p ON p.id = r.project_id
         LEFT JOIN requests parent ON parent.id = r.parent_request_id
         LEFT JOIN requests dependency ON dependency.id = r.depends_on_request_id
        WHERE r.client_id = ?
        ORDER BY r.created_at DESC`,
      [req.client.id]
    );
    if (!rows.length) return res.json({ success: true, requests: [] });

    const ids = rows.map((row) => row.id);
    const slots = ids.map(() => '?').join(',');

    // visibility = 'client' is load-bearing: internal team notes must never be
    // exposed through the portal.
    const [comments] = await db.execute(
      `SELECT c.request_id, c.comment, c.created_at, c.client_id, e.name AS author
         FROM request_comments c
         LEFT JOIN employees e ON e.id = c.employee_id
        WHERE c.request_id IN (${slots}) AND c.visibility = 'client'
        ORDER BY c.created_at ASC`,
      ids
    );
    const [files] = await db.execute(
      `SELECT id, request_id, file_name, file_url, file_type, version, created_at
         FROM files
        WHERE request_id IN (${slots}) AND client_id = ?
        ORDER BY created_at DESC`,
      [...ids, req.client.id]
    );
    const [activities] = await db.execute(
      `SELECT request_id, event_type, label, created_at
         FROM request_activity
        WHERE request_id IN (${slots})
        ORDER BY created_at DESC, id DESC`,
      ids
    );
    const parentIds = rows.filter((row) => row.request_kind === 'parent').map((row) => row.id);
    const breakdownParts = parentIds.length
      ? await Promise.all(parentIds.map((id) => loadBreakdown(db, id)))
      : [];

    const byRequest = (list) => list.reduce((acc, item) => {
      (acc[item.request_id] ||= []).push(item);
      return acc;
    }, {});
    const commentMap = byRequest(comments);
    const fileMap = byRequest(files);
    const activityMap = byRequest(activities);
    const childMap = rows.reduce((acc, row) => {
      if (row.parent_request_id) (acc[row.parent_request_id] ||= []).push(row);
      return acc;
    }, {});
    const breakdownMap = parentIds.reduce((acc, id, index) => {
      acc[id] = breakdownParts[index];
      return acc;
    }, {});
    const orderedQueue = rows
      .filter((row) => row.status === 'queue' && row.request_kind !== 'parent')
      .sort((a, b) => Number(a.queue_position || Number.MAX_SAFE_INTEGER) - Number(b.queue_position || Number.MAX_SAFE_INTEGER));
    const queueOrder = orderedQueue.reduce((acc, row, index) => { acc[row.id] = index + 1; return acc; }, {});

    const requests = rows.map((row) => ({
      ...toPortalRequest(row, {
        comments: (commentMap[row.id] || []).map((c) => ({
          who: c.client_id ? 'You' : (c.author || 'Clockwrk'),
          at: shortDate(c.created_at),
          text: c.comment,
        })),
        deliverables: (fileMap[row.id] || []).map((f, index) => ({
          id: f.id, name: f.file_name, url: f.file_url, kind: fileKind(f),
          version: f.version || 1, at: shortDate(f.created_at), current: index === 0,
        })),
        activities: activityMap[row.id] || [],
        children: childMap[row.id] || [],
        breakdown: breakdownMap[row.id] || [],
      }),
      queuePos: queueOrder[row.id] || 0,
    }));

    return res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/requests ────────────────────────────────────────────────
router.post('/requests', clientAuth, async (req, res) => {
  const { project_id, title, description, type, priority } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, message: 'title required' });
  if (!project_id) return res.status(400).json({ success: false, message: 'project_id required' });

  const allowedPriority = ['low', 'normal', 'high', 'urgent'];
  const cleanPriority = allowedPriority.includes(String(priority).toLowerCase())
    ? String(priority).toLowerCase()
    : 'normal';

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM clients WHERE id = ? FOR UPDATE', [req.client.id]);
    // Never trust the client's project_id — confirm it belongs to them, or a
    // client could file requests into another company's project.
    const [[project]] = await conn.execute(
      'SELECT id FROM projects WHERE id = ? AND client_id = ?',
      [project_id, req.client.id]
    );
    if (!project) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Project not found for this account' });
    }

    const queuePosition = await nextQueuePosition(conn, req.client.id);
    const [result] = await conn.execute(
      `INSERT INTO requests
         (project_id, client_id, title, description, type, status, priority, request_kind, scope_status, queue_position)
       VALUES (?, ?, ?, ?, ?, 'queue', ?, 'normal', 'none', ?)`,
      [project_id, req.client.id, title.trim(), description?.trim() || null, type || null, cleanPriority, queuePosition]
    );
    await addRequestActivity(conn, result.insertId, 'request_submitted', 'Request submitted', {
      actorType: 'client', actorId: req.client.id,
    });
    const [[row]] = await conn.execute(
      `SELECT r.*, p.name AS project_name
         FROM requests r LEFT JOIN projects p ON p.id = r.project_id
        WHERE r.id = ?`,
      [result.insertId]
    );
    await conn.commit();
    // Fire-and-forget: never let a failed alert kill the request creation.
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('system', 'New client request', ?, '/requests')",
        [`${req.client.name}: ${title.trim()}`]
      );
    } catch (alertErr) { console.error('new-request alert failed:', alertErr.message); }
    return res.status(201).json({ success: true, request: toPortalRequest(row) });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// ─── Helper: load a request the signed-in client owns ─────────────────────────
async function ownedRequest(clientId, requestId) {
  const [[row]] = await db.execute(
    'SELECT * FROM requests WHERE id = ? AND client_id = ?',
    [requestId, clientId]
  );
  return row || null;
}

router.put('/requests/queue', clientAuth, async (req, res) => {
  try {
    const orderedIds = await reorderClientQueue({ clientId: req.client.id, orderedIds: req.body?.ordered_ids });
    return res.json({ success: true, ordered_ids: orderedIds });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.get('/requests/:id/breakdown', clientAuth, async (req, res) => {
  try {
    const request = await ownedRequest(req.client.id, req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.request_kind !== 'parent') return res.status(409).json({ success: false, message: 'This request does not have a breakdown' });
    const parts = await loadBreakdown(db, request.id);
    return res.json({ success: true, parts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/requests/:id/breakdown/approve', clientAuth, async (req, res) => {
  try {
    const result = await approveBreakdown({ parentRequestId: Number(req.params.id), clientId: req.client.id });
    const promoted = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const next = await promoteNextQueued(req.client.id);
      if (!next) break;
      promoted.push(next);
    }
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('system', 'Request breakdown approved', ?, '/requests')",
        [`${req.client.name} approved ${result.children.length} linked requests`]
      );
    } catch (alertErr) { console.error('breakdown approval alert failed:', alertErr.message); }
    return res.json({ success: true, ...result, promoted });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ─── POST /api/client/requests/:id/approve ────────────────────────────────────
router.post('/requests/:id/approve', clientAuth, async (req, res) => {
  try {
    const request = await ownedRequest(req.client.id, req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.request_kind === 'parent') return res.status(409).json({ success: false, message: 'Approve the request breakdown from the group overview.' });
    if (request.status === 'completed') return res.status(409).json({ success: false, message: 'Already approved' });

    await db.execute(
      "UPDATE requests SET status = 'completed', approval_status = 'approved', completed_at = NOW(), completion_percent = 100 WHERE id = ?",
      [request.id]
    );
    await addRequestActivity(db, request.id, 'delivery_approved', 'Delivery approved', {
      actorType: 'client', actorId: req.client.id,
    });
    const promoted = await promoteNextQueued(req.client.id);

    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('system', 'Delivery approved', ?, '/requests')",
        [`${req.client.name} approved: ${request.title}`]
      );
    } catch (alertErr) { console.error('approve alert failed:', alertErr.message); }

    return res.json({ success: true, promoted: promoted ? promoted.title : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/requests/:id/revision ───────────────────────────────────
router.post('/requests/:id/revision', clientAuth, async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ success: false, message: 'note required' });
  try {
    const request = await ownedRequest(req.client.id, req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.request_kind === 'parent') return res.status(409).json({ success: false, message: 'Discuss the breakdown from the request group.' });

    await db.execute(
      "UPDATE requests SET status = 'revision', approval_status = 'rejected', revision_notes = ? WHERE id = ?",
      [note.trim(), request.id]
    );
    await addRequestActivity(db, request.id, 'revision_requested', 'Changes requested', {
      actorType: 'client', actorId: req.client.id,
    });
    // Keep the note in the thread as well, so the conversation stays complete.
    await db.execute(
      "INSERT INTO request_comments (request_id, client_id, comment, visibility) VALUES (?, ?, ?, 'client')",
      [request.id, req.client.id, note.trim()]
    );

    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('support', 'Changes requested', ?, '/requests')",
        [`${req.client.name} on "${request.title}": ${note.trim().slice(0, 100)}`]
      );
    } catch (alertErr) { console.error('revision alert failed:', alertErr.message); }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/requests/:id/comments ───────────────────────────────────
router.post('/requests/:id/comments', clientAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: 'text required' });
  try {
    const request = await ownedRequest(req.client.id, req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const [result] = await db.execute(
      "INSERT INTO request_comments (request_id, client_id, comment, visibility) VALUES (?, ?, ?, 'client')",
      [request.id, req.client.id, text.trim()]
    );
    await addRequestActivity(db, request.id, 'client_comment', 'Client added a comment', {
      actorType: 'client', actorId: req.client.id,
    });
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('message', 'New request comment', ?, '/requests')",
        [`${req.client.name} on "${request.title}": ${text.trim().slice(0, 100)}`]
      );
    } catch (alertErr) { console.error('comment alert failed:', alertErr.message); }

    return res.status(201).json({ success: true, comment: { id: result.insertId, who: 'You', at: 'Just now', text: text.trim() } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/projects ────────────────────────────────────────────────
router.post('/projects', clientAuth, async (req, res) => {
  const { name, type, icon, description, goal, audience, success_measure, target_date, links = [], resources = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'name required' });
  try {
    const [result] = await db.execute(
      `INSERT INTO projects (client_id, name, type, icon_emoji, status, notes, goal, audience,
                             success_measure, due_date, start_date)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, CURDATE())`,
      [req.client.id, name.trim(), type || 'Other', icon || null, description?.trim() || null,
       goal?.trim() || null, audience?.trim() || null, success_measure?.trim() || null, target_date || null]
    );
    // Links and resources supplied during setup.
    for (const link of Array.isArray(links) ? links.slice(0, 20) : []) {
      if (!link?.url?.trim()) continue;
      await db.execute(
        'INSERT INTO project_links (project_id, kind, label, url) VALUES (?, ?, ?, ?)',
        [result.insertId, link.kind || 'other', (link.label || 'Link').slice(0, 120), link.url.trim()]
      );
    }
    for (const item of Array.isArray(resources) ? resources.slice(0, 30) : []) {
      if (!item?.title?.trim()) continue;
      await db.execute(
        'INSERT INTO project_resources (project_id, client_id, kind, title, url, file_url, file_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, req.client.id, item.kind || 'other', item.title.trim().slice(0, 200),
         item.url || null, item.file_url || null, item.file_name || null, item.notes || null]
      );
    }
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('system', 'New client project', ?, '/projects')",
        [`${req.client.name} created: ${name.trim()}`]
      );
    } catch (alertErr) { console.error('project alert failed:', alertErr.message); }
    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Project detail, brief, links, resources, activity ────────────────────────

async function ownedProject(clientId, projectId) {
  const [[row]] = await db.execute(
    `SELECT id, name, type, icon_emoji, logo_url, status, notes AS description, goal, audience,
            success_measure, progress_percent, start_date, due_date, live_url, staging_url,
            tech_stack, created_at
       FROM projects WHERE id = ? AND client_id = ?`,
    [projectId, clientId]
  );
  return row || null;
}

// ─── GET /api/client/projects/:id ─────────────────────────────────────────────
router.get('/projects/:id', clientAuth, async (req, res) => {
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });

    const [links] = await db.execute(
      'SELECT id, kind, label, url FROM project_links WHERE project_id = ? ORDER BY id',
      [row.id]
    );
    const [resources] = await db.execute(
      'SELECT id, kind, title, url, file_url, file_name, notes, created_at FROM project_resources WHERE project_id = ? ORDER BY created_at DESC',
      [row.id]
    );

    // Work summary — counts, not a completion percentage. Clockwrk projects can
    // stay open indefinitely, so "62% complete" was never meaningful.
    const [[counts]] = await db.execute(
      `SELECT
         SUM(status IN ('in_progress','revision')) AS inProgress,
         SUM(status = 'in_review')                 AS needsReview,
         SUM(status = 'queue')                     AS upNext,
         SUM(status = 'completed')                 AS delivered
       FROM requests WHERE project_id = ? AND client_id = ? AND request_kind != 'parent'`,
      [row.id, req.client.id]
    );

    // Activity derived from what actually happened — no separate events table to
    // drift out of sync, and nothing invented.
    const [activity] = await db.execute(
      `(SELECT 'request_created' AS kind, r.title AS subject, r.created_at AS at FROM requests r
          WHERE r.project_id = ? )
       UNION ALL
       (SELECT 'request_delivered', r.title, r.completed_at FROM requests r
          WHERE r.project_id = ? AND r.completed_at IS NOT NULL)
       UNION ALL
       (SELECT 'comment', r.title, c.created_at FROM request_comments c
          JOIN requests r ON r.id = c.request_id
          WHERE r.project_id = ? AND c.visibility = 'client')
       UNION ALL
       (SELECT 'file', f.file_name, f.created_at FROM files f WHERE f.project_id = ?)
       UNION ALL
       (SELECT 'message', LEFT(m.content, 80), m.created_at FROM client_messages m WHERE m.project_id = ?)
       ORDER BY at DESC LIMIT 12`,
      [row.id, row.id, row.id, row.id, row.id]
    );

    return res.json({
      success: true,
      project: { ...toPortalProject(row), links, resources },
      summary: {
        inProgress: Number(counts.inProgress || 0),
        needsReview: Number(counts.needsReview || 0),
        upNext: Number(counts.upNext || 0),
        delivered: Number(counts.delivered || 0),
      },
      activity: activity.filter((a) => a.at).map((a) => ({ ...a, at: shortDate(a.at) })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/client/projects/:id ───────────────────────────────────────────
router.patch('/projects/:id', clientAuth, async (req, res) => {
  const { name, type, icon, description, goal, audience, success_measure, target_date, logo_url } = req.body;
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    await db.execute(
      `UPDATE projects SET name = COALESCE(?, name), type = COALESCE(?, type),
              icon_emoji = COALESCE(?, icon_emoji), logo_url = COALESCE(?, logo_url),
              notes = COALESCE(?, notes), goal = COALESCE(?, goal), audience = COALESCE(?, audience),
              success_measure = COALESCE(?, success_measure), due_date = COALESCE(?, due_date)
       WHERE id = ?`,
      [name?.trim() || null, type || null, icon || null, logo_url || null, description ?? null,
       goal ?? null, audience ?? null, success_measure ?? null, target_date || null, row.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Project links ────────────────────────────────────────────────────────────
router.post('/projects/:id/links', clientAuth, async (req, res) => {
  const { kind, label, url } = req.body;
  if (!url?.trim()) return res.status(400).json({ success: false, message: 'url required' });
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    const [result] = await db.execute(
      'INSERT INTO project_links (project_id, kind, label, url) VALUES (?, ?, ?, ?)',
      [row.id, kind || 'other', (label || 'Link').slice(0, 120), url.trim()]
    );
    return res.status(201).json({ success: true, link: { id: result.insertId, kind: kind || 'other', label: label || 'Link', url: url.trim() } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/projects/:id/links/:linkId', clientAuth, async (req, res) => {
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    await db.execute('DELETE FROM project_links WHERE id = ? AND project_id = ?', [req.params.linkId, row.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Project resources (client-supplied inputs, not Clockwrk outputs) ─────────
router.post('/projects/:id/resources', clientAuth, async (req, res) => {
  const { kind, title, url, file_url, file_name, notes } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, message: 'title required' });
  if (!url?.trim() && !file_url) return res.status(400).json({ success: false, message: 'a link or a file is required' });
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    const [result] = await db.execute(
      'INSERT INTO project_resources (project_id, client_id, kind, title, url, file_url, file_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [row.id, req.client.id, kind || 'other', title.trim().slice(0, 200), url?.trim() || null, file_url || null, file_name || null, notes || null]
    );
    const [[created]] = await db.execute('SELECT id, kind, title, url, file_url, file_name, notes, created_at FROM project_resources WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, resource: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/projects/:id/resources/:resourceId', clientAuth, async (req, res) => {
  try {
    const row = await ownedProject(req.client.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    await db.execute('DELETE FROM project_resources WHERE id = ? AND project_id = ?', [req.params.resourceId, row.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/client/uploads ─────────────────────────────────────────────────
// Client-side upload to R2. Returns a URL the caller then attaches to a project
// resource, a request, or a message.
router.post('/uploads', clientAuth, (req, res) => {
  clientUpload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const key = `clients/${req.client.id}/${Date.now()}-${safeKey(req.file.originalname)}`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype,
      }));
      return res.json({
        success: true,
        url: `${R2_PUBLIC}/${key}`,
        name: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype,
      });
    } catch (err) {
      console.error('client upload failed:', err);
      return res.status(500).json({ success: false, message: 'Upload failed. Try again.' });
    }
  });
});

// ─── Notification preferences ─────────────────────────────────────────────────
const NOTIFY_KEYS = ['delivery_ready', 'team_message', 'billing_activity', 'weekly_summary'];

router.put('/notifications', clientAuth, async (req, res) => {
  const incoming = req.body || {};
  const prefs = {};
  for (const key of NOTIFY_KEYS) prefs[key] = !!incoming[key];
  try {
    await db.execute('UPDATE clients SET notify_prefs = ? WHERE id = ?', [JSON.stringify(prefs), req.client.id]);
    return res.json({ success: true, notify_prefs: prefs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Client contacts (the client's own people, not Clockwrk staff) ────────────
router.get('/contacts', clientAuth, async (req, res) => {
  try {
    const [contacts] = await db.execute(
      'SELECT id, name, email, role, can_approve, can_bill FROM client_contacts WHERE client_id = ? ORDER BY id',
      [req.client.id]
    );
    return res.json({ success: true, contacts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/contacts', clientAuth, async (req, res) => {
  const { name, email, role, can_approve = true, can_bill = false } = req.body;
  if (!email?.includes('@')) return res.status(400).json({ success: false, message: 'A valid email is required' });
  try {
    const [result] = await db.execute(
      'INSERT INTO client_contacts (client_id, name, email, role, can_approve, can_bill) VALUES (?, ?, ?, ?, ?, ?)',
      [req.client.id, (name || email.split('@')[0]).slice(0, 160), email.trim().toLowerCase(), role || 'Team member', can_approve ? 1 : 0, can_bill ? 1 : 0]
    );
    const [[created]] = await db.execute('SELECT id, name, email, role, can_approve, can_bill FROM client_contacts WHERE id = ?', [result.insertId]);
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('system', 'Client added a contact', ?, '/clients')",
        [`${req.client.name} added ${created.email} to their workspace`]
      );
    } catch (alertErr) { console.error('contact alert failed:', alertErr.message); }
    return res.status(201).json({ success: true, contact: created });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'That person is already on your workspace.' });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/contacts/:id', clientAuth, async (req, res) => {
  const { can_approve, can_bill, role } = req.body;
  try {
    await db.execute(
      'UPDATE client_contacts SET can_approve = COALESCE(?, can_approve), can_bill = COALESCE(?, can_bill), role = COALESCE(?, role) WHERE id = ? AND client_id = ?',
      [can_approve === undefined ? null : (can_approve ? 1 : 0), can_bill === undefined ? null : (can_bill ? 1 : 0), role || null, req.params.id, req.client.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/contacts/:id', clientAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM client_contacts WHERE id = ? AND client_id = ?', [req.params.id, req.client.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Calls / bookings ─────────────────────────────────────────────────────────
// Availability is generated from real working hours and filtered against real
// bookings — never a hardcoded list of times.
const CALL_HOURS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

router.get('/bookings/availability', clientAuth, async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 10, 21);
    const [taken] = await db.execute(
      "SELECT booking_date, booking_time FROM bookings WHERE booking_date >= CURDATE() AND status <> 'cancelled'"
    );
    const takenSet = new Set(taken.map((t) => `${new Date(t.booking_date).toISOString().slice(0, 10)} ${t.booking_time}`));

    const slots = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() + 1);     // never offer today
    while (slots.length < days) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {           // weekdays only
        const iso = cursor.toISOString().slice(0, 10);
        const times = CALL_HOURS.filter((time) => !takenSet.has(`${iso} ${time}`));
        if (times.length) slots.push({ date: iso, times });
      }
      cursor.setDate(cursor.getDate() + 1);
      if (slots.length >= days || cursor.getTime() - Date.now() > 45 * 86400000) break;
    }
    return res.json({ success: true, slots });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/bookings', clientAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, booking_date, booking_time, notes, status, zoom_link
         FROM bookings
        WHERE email = ? AND booking_date >= CURDATE() AND status <> 'cancelled'
        ORDER BY booking_date, booking_time`,
      [req.client.email]
    );
    return res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/bookings', clientAuth, async (req, res) => {
  const { date, time, notes, project_id } = req.body;
  if (!date || !time) return res.status(400).json({ success: false, message: 'date and time required' });
  if (!CALL_HOURS.includes(time)) return res.status(400).json({ success: false, message: 'That time is not available' });
  try {
    const [[clash]] = await db.execute(
      "SELECT id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status <> 'cancelled'",
      [date, time]
    );
    if (clash) return res.status(409).json({ success: false, message: 'That slot was just taken. Pick another.' });

    let projectName = null;
    if (project_id) {
      const [[project]] = await db.execute('SELECT name FROM projects WHERE id = ? AND client_id = ?', [project_id, req.client.id]);
      projectName = project?.name || null;
    }
    const [[client]] = await db.execute('SELECT name, email, company FROM clients WHERE id = ?', [req.client.id]);
    const note = [projectName && `Project: ${projectName}`, notes?.trim()].filter(Boolean).join(' — ') || 'Call requested from the client portal';

    await db.execute(
      `INSERT INTO bookings (name, email, company, booking_date, booking_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [client.name, client.email, client.company || null, date, time, note]
    );
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('booking', 'Client booked a call', ?, '/bookings')",
        [`${client.name} booked ${date} at ${time}`]
      );
    } catch (alertErr) { console.error('booking alert failed:', alertErr.message); }
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Billing: payment details, quotes, and change requests ────────────────────

const PLAN_KEY = (name) => String(name || '').toLowerCase();
const followingBillingDate = (effectiveDate, cadence) => {
  if (!effectiveDate) return null;
  const days = cadence === 'monthly' ? 30 : 7;
  const date = new Date(effectiveDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

router.get('/billing/payment-details', clientAuth, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'pay_%'");
    const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
    return res.json({
      success: true,
      payment: {
        beneficiary: map.pay_beneficiary || null,
        bankName: map.pay_bank_name || null,
        accountNumber: map.pay_account_number || null,
        routingNumber: map.pay_routing_number || null,
        currency: map.pay_currency || 'USD',
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// What the account currently has, including add-ons and real slot count.
router.get('/billing/summary', clientAuth, async (req, res) => {
  try {
    await sweepChanges();
    const [[client]] = await db.execute(
      'SELECT plan, billing, next_payment_due FROM clients WHERE id = ?', [req.client.id]
    );
    const [addons] = await db.execute(
      'SELECT id, addon_id, quantity, status, ends_at FROM client_addons WHERE client_id = ?', [req.client.id]
    );
    const [changes] = await db.execute(
      `SELECT id, kind, direction, mode, from_value, to_value, target_cadence, quantity, amount_due, amount_received,
              credit_applied, payment_ref, status, effective_date, new_billing_date, requested_at, expires_at
         FROM subscription_changes
        WHERE client_id = ? AND status IN ('awaiting_payment','payment_reported','partially_paid','scheduled')
        ORDER BY requested_at DESC`,
      [req.client.id]
    );
    return res.json({
      success: true,
      plan: client?.plan || null,
      cadence: client?.billing || 'weekly',
      nextBillingDate: client?.next_payment_due || null,
      slots: await slotsFor(req.client.id),
      addons: addons.map((a) => ({ ...a, name: ADDONS[a.addon_id]?.name || a.addon_id })),
      pendingChanges: changes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Price every option so the portal can show them side by side.
router.get('/billing/quote', clientAuth, async (req, res) => {
  const { kind = 'plan', target, quantity = 1, cadence } = req.query;
  try {
    const [[client]] = await db.execute(
      'SELECT plan, billing, next_payment_due FROM clients WHERE id = ?', [req.client.id]
    );

    // Switching weekly <-> monthly keeps the same plan; it just changes the rate
    // and cycle length from the next payment on. Nothing to pay now, so it never
    // needs the three-way pay picker.
    if (kind === 'cadence') {
      const currentCadence = client?.billing || 'weekly';
      if (!['weekly', 'monthly'].includes(target)) return res.status(400).json({ success: false, message: 'Unknown billing cadence' });
      if (target === currentCadence) return res.status(400).json({ success: false, message: `You are already billed ${currentCadence}.` });
      const planRow = PLANS[PLAN_KEY(client?.plan)];
      return res.json({
        success: true,
        cadenceChange: true,
        target,
        currentCadence,
        effectiveDate: client?.next_payment_due || null,
        currentPrice: planRow ? (currentCadence === 'monthly' ? planRow.monthly : planRow.weekly) : 0,
        newPrice: planRow ? (target === 'monthly' ? planRow.monthly : planRow.weekly) : 0,
        followingBillingDate: followingBillingDate(client?.next_payment_due, target),
      });
    }

    if (kind === 'plan' && !PLANS[target]) return res.status(400).json({ success: false, message: 'Unknown plan' });
    if (kind === 'addon' && !ADDONS[target]) return res.status(400).json({ success: false, message: 'Unknown add-on' });

    const currentKey = PLAN_KEY(client?.plan);
    const currentCadence = client?.billing || 'weekly';
    const targetCadence = kind === 'plan' ? (cadence || currentCadence) : currentCadence;
    if (!['weekly', 'monthly'].includes(targetCadence)) {
      return res.status(400).json({ success: false, message: 'Unknown billing cadence' });
    }
    // Downgrades cost nothing now — they simply take effect at period end.
    const isDowngrade = kind === 'plan'
      && PLANS[target] && PLANS[currentKey]
      && PLANS[target].slots < PLANS[currentKey].slots;

    if (isDowngrade) {
      return res.json({
        success: true,
        downgrade: true,
        effectiveDate: client?.next_payment_due,
        currentCadence,
        targetCadence,
        newPrice: targetCadence === 'monthly' ? PLANS[target].monthly : PLANS[target].weekly,
        followingBillingDate: followingBillingDate(client?.next_payment_due, targetCadence),
        newSlots: PLANS[target].slots,
        currentSlots: await slotsFor(req.client.id),
      });
    }

    return res.json({
      success: true,
      downgrade: false,
      ...quote({
        kind,
        currentPlanKey: currentKey,
        targetKey: target,
        currentCadence,
        targetCadence,
        nextDue: client?.next_payment_due,
        quantity: Number(quantity) || 1,
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message || 'Could not price that change' });
  }
});

router.post('/billing/changes', clientAuth, async (req, res) => {
  const { kind = 'plan', target, cadence, mode = 'prorate_now', quantity = 1, notes } = req.body;
  try {
    const [[client]] = await db.execute(
      'SELECT plan, billing, next_payment_due FROM clients WHERE id = ?', [req.client.id]
    );
    const currentKey = PLAN_KEY(client?.plan);
    const currentCadence = client?.billing || 'weekly';
    const targetCadence = kind === 'plan' ? (cadence || currentCadence) : currentCadence;
    if (kind === 'plan' && !['weekly', 'monthly'].includes(targetCadence)) {
      return res.status(400).json({ success: false, message: 'Unknown billing cadence' });
    }

    // One open change at a time keeps bank reconciliation sane.
    const [[open]] = await db.execute(
      "SELECT id FROM subscription_changes WHERE client_id = ? AND status IN ('awaiting_payment','payment_reported','partially_paid','scheduled')",
      [req.client.id]
    );
    if (open) return res.status(409).json({ success: false, message: 'You already have a change awaiting payment. Complete or cancel it first.' });

    // Cadence switch: same plan, scheduled for the next payment, nothing to pay.
    if (kind === 'cadence') {
      const currentCadence = client?.billing || 'weekly';
      if (!['weekly', 'monthly'].includes(target)) return res.status(400).json({ success: false, message: 'Unknown billing cadence' });
      if (target === currentCadence) return res.status(400).json({ success: false, message: `You are already billed ${currentCadence}.` });
      const effective = client?.next_payment_due || new Date().toISOString().slice(0, 10);
      const ref = paymentRef(req.client.id);
      const [result] = await db.execute(
        `INSERT INTO subscription_changes
           (client_id, kind, direction, mode, from_value, to_value, quantity, full_price,
            credit_applied, amount_due, payment_ref, status, effective_date, notes)
         VALUES (?, 'cadence', 'switch', 'at_renewal', ?, ?, 1, 0, 0, 0, ?, 'scheduled', ?, ?)`,
        [req.client.id, currentCadence, target, ref, effective, notes || null]
      );
      try {
        await db.execute(
          "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'Billing cadence change', ?, '/finance')",
          [`${req.client.name}: switching to ${target} billing from ${effective}`]
        );
      } catch (alertErr) { console.error('cadence alert failed:', alertErr.message); }
      return res.status(201).json({ success: true, id: result.insertId, scheduled: true, effectiveDate: effective });
    }

    const isDowngrade = kind === 'plan' && PLANS[target] && PLANS[currentKey]
      && PLANS[target].slots < PLANS[currentKey].slots;
    const isRemoval = kind === 'addon' && mode === 'remove';

    // Downgrades and removals: schedule for period end, nothing to pay.
    if (isDowngrade || isRemoval) {
      const effective = client?.next_payment_due;
      const [result] = await db.execute(
        `INSERT INTO subscription_changes
           (client_id, kind, direction, mode, from_value, to_value, target_cadence, quantity, full_price,
            credit_applied, amount_due, payment_ref, status, effective_date, notes)
         VALUES (?, ?, ?, 'at_renewal', ?, ?, ?, ?, 0, 0, 0, ?, 'scheduled', ?, ?)`,
        [req.client.id, kind, isRemoval ? 'remove' : 'downgrade', currentKey, target,
         kind === 'plan' ? targetCadence : null, Number(quantity) || 1, paymentRef(req.client.id), effective, notes || null]
      );
      if (isRemoval) {
        await db.execute(
          "UPDATE client_addons SET status = 'scheduled_removal', ends_at = ? WHERE client_id = ? AND addon_id = ?",
          [effective, req.client.id, target]
        );
      }
      return res.status(201).json({ success: true, id: result.insertId, scheduled: true, effectiveDate: effective });
    }

    const priced = quote({
      kind,
      currentPlanKey: currentKey,
      targetKey: target,
      currentCadence,
      targetCadence,
      nextDue: client?.next_payment_due,
      quantity: Number(quantity) || 1,
    });
    const chosen = priced.options.find((o) => o.mode === mode);
    if (!chosen) return res.status(400).json({ success: false, message: 'That option is not available for this change' });

    const ref = paymentRef(req.client.id);
    const status = chosen.amountDue > 0 ? 'awaiting_payment' : 'scheduled';
    const expires = chosen.amountDue > 0 ? expiryFor(mode) : null;

    const [result] = await db.execute(
      `INSERT INTO subscription_changes
         (client_id, kind, direction, mode, from_value, to_value, target_cadence, quantity, full_price,
          credit_applied, amount_due, payment_ref, status, effective_date, new_billing_date, expires_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.client.id, kind, kind === 'addon' ? 'add' : 'upgrade', mode, currentKey, target,
       kind === 'plan' ? targetCadence : null, Number(quantity) || 1, priced.targetPrice, chosen.creditApplied, chosen.amountDue, ref, status,
       mode === 'at_renewal' ? client?.next_payment_due : null,
       mode === 'fresh_cycle' ? chosen.nextBillingDate : null,
       expires, notes || null]
    );

    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'Subscription change requested', ?, '/finance')",
        [`${req.client.name}: ${target} · ${targetCadence} (${mode}) — $${chosen.amountDue} due, ref ${ref}`]
      );
    } catch (alertErr) { console.error('change alert failed:', alertErr.message); }

    return res.status(201).json({ success: true, id: result.insertId, paymentRef: ref, amountDue: chosen.amountDue, status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Client reports the transfer. This PAUSES the expiry timer — only people who
// never started should ever be auto-cancelled.
router.post('/billing/changes/:id/reported', clientAuth, async (req, res) => {
  try {
    const [[change]] = await db.execute(
      "SELECT id, payment_ref, amount_due FROM subscription_changes WHERE id = ? AND client_id = ? AND status = 'awaiting_payment'",
      [req.params.id, req.client.id]
    );
    if (!change) return res.status(404).json({ success: false, message: 'No open change found' });
    await db.execute(
      "UPDATE subscription_changes SET status = 'payment_reported', reported_at = NOW(), expires_at = NULL WHERE id = ?",
      [change.id]
    );
    try {
      await db.execute(
        "INSERT INTO dashboard_alerts (type, title, message, link) VALUES ('payment', 'Transfer reported — verify it', ?, '/finance')",
        [`${req.client.name} reported $${change.amount_due} sent, ref ${change.payment_ref}`]
      );
    } catch (alertErr) { console.error('reported alert failed:', alertErr.message); }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/billing/changes/:id/cancel', clientAuth, async (req, res) => {
  try {
    const [[change]] = await db.execute(
      "SELECT id, kind, to_value FROM subscription_changes WHERE id = ? AND client_id = ? AND status IN ('awaiting_payment','payment_reported','scheduled')",
      [req.params.id, req.client.id]
    );
    if (!change) return res.status(404).json({ success: false, message: 'Change not found' });
    await db.execute("UPDATE subscription_changes SET status = 'cancelled' WHERE id = ?", [change.id]);
    // A cancelled removal puts the add-on back to active.
    if (change.kind === 'addon') {
      await db.execute(
        "UPDATE client_addons SET status = 'active', ends_at = NULL WHERE client_id = ? AND addon_id = ? AND status = 'scheduled_removal'",
        [req.client.id, change.to_value]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
