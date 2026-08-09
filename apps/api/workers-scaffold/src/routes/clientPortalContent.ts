import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";
import { requireClient } from "../middleware/auth";
import {
  isAllowedMime,
  MAX_UPLOAD_BYTES,
  putR2,
  safeKey,
} from "../lib/uploads";
import {
  deleteProjectTree,
  getClientMessageFeed,
} from "../services/clientPortal";

type App = { Bindings: Env; Variables: Variables };
type Ctx = Context<App>;
type Row = Record<string, any>;
const app = new Hono<App>();
const body = (c: Ctx): Promise<Row> => c.req.json<Row>().catch(() => ({}));
const cid = (c: Ctx) => c.get("client")!.id;
const TYPE_EMOJI: Record<string, string[]> = {
  Website: ["🌐", "🖥️", "🧭"],
  "Web app": ["⚙️", "🧩", "🛠️"],
  "Mobile app": ["📱", "🚀", "🧿"],
  "E-commerce": ["🛒", "🏷️", "📦"],
  "Brand identity": ["🎨", "✨", "🪄"],
  "Design system": ["🧱", "📐", "🎛️"],
  "Marketing campaign": ["📣", "🎯", "📈"],
  Content: ["✍️", "📝", "📚"],
  "Pitch deck": ["📊", "🎤", "💼"],
  "Product launch": ["🚀", "🎉", "🧨"],
  "SaaS platform": ["☁️", "🔗", "⚡"],
  "Internal tool": ["🔧", "🗂️", "🧮"],
  Research: ["🔬", "🧪", "🔎"],
  Other: ["📁", "🗃️", "🧷"],
};
const emoji = (type: string, id: number) => {
  const set = TYPE_EMOJI[type] || TYPE_EMOJI.Other!;
  return set[Number(id || 0) % set.length];
};
const portalProject = (row: Row) => ({
  id: row.id,
  name: row.name,
  type: row.type || "Other",
  icon: row.icon_emoji || emoji(row.type, row.id),
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
  stack: String(row.tech_stack || "")
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter(Boolean),
  pm: null,
  am: null,
  members: [],
  createdAt: row.created_at,
});
const shortDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const ownedProject = (c: Ctx, id: unknown) =>
  c.env.DB.prepare(
    `SELECT id,name,type,icon_emoji,logo_url,status,notes AS description,goal,audience,success_measure,progress_percent,start_date,due_date,live_url,staging_url,tech_stack,created_at FROM projects WHERE id=? AND client_id=?`,
  )
    .bind(id, cid(c))
    .first<Row>();

export async function saveClientAttachments(
  db: D1Database,
  input: {
    clientId: number;
    projectId?: number | null;
    requestId?: number | null;
    messageId?: number | null;
    attachments?: unknown;
  },
) {
  if (!Array.isArray(input.attachments)) return [];
  const rows: Row[] = [];
  for (const raw of input.attachments as Row[]) {
    const url = String(raw?.url || "").trim();
    if (!url) continue;
    const name = String(raw?.name || "file").slice(0, 250);
    const type = String(raw?.mime || raw?.type || "").slice(0, 100) || null;
    const result = await db
      .prepare(
        `INSERT INTO files (client_id,project_id,request_id,message_id,file_name,file_url,file_type,category) VALUES (?,?,?,?,?,?,?,'attachment')`,
      )
      .bind(
        input.clientId,
        input.projectId ?? null,
        input.requestId ?? null,
        input.messageId ?? null,
        name,
        url,
        type,
      )
      .run();
    rows.push({ id: result.meta.last_row_id, name, url, file_type: type });
  }
  return rows;
}

app.get("/projects", requireClient, async (c) => {
  const rows = (
    await c.env.DB.prepare(
      `SELECT id,name,type,icon_emoji,logo_url,status,notes AS description,goal,audience,success_measure,progress_percent,start_date,due_date,live_url,staging_url,tech_stack,created_at FROM projects WHERE client_id=? ORDER BY created_at DESC`,
    )
      .bind(cid(c))
      .all<Row>()
  ).results;
  return c.json({ success: true, projects: rows.map(portalProject) });
});

app.post("/projects", requireClient, async (c) => {
  const b = await body(c);
  const name = String(b.name || "").trim();
  if (!name) return c.json({ success: false, message: "name required" }, 400);
  const links = Array.isArray(b.links) ? b.links.slice(0, 20) : [];
  const resources = Array.isArray(b.resources) ? b.resources.slice(0, 30) : [];
  const result = await c.env.DB.prepare(
    `INSERT INTO projects (client_id,name,type,icon_emoji,status,notes,goal,audience,success_measure,due_date,start_date) VALUES (?,?,?,?,'active',?,?,?,?,?,date('now'))`,
  )
    .bind(
      cid(c),
      name,
      b.type || "Other",
      b.icon || null,
      String(b.description || "").trim() || null,
      String(b.goal || "").trim() || null,
      String(b.audience || "").trim() || null,
      String(b.success_measure || "").trim() || null,
      b.target_date || null,
    )
    .run();
  const projectId = Number(result.meta.last_row_id);
  const statements: D1PreparedStatement[] = [];
  const linkKinds = new Set([
    "production",
    "staging",
    "figma",
    "github",
    "appstore",
    "docs",
    "prototype",
    "other",
  ]);
  const resourceKinds = new Set([
    "brand",
    "website",
    "requirements",
    "competitor",
    "figma",
    "drive",
    "research",
    "other",
  ]);
  for (const link of links as Row[]) {
    if (!String(link?.url || "").trim()) continue;
    const kind = linkKinds.has(String(link.kind).toLowerCase())
      ? String(link.kind).toLowerCase()
      : "other";
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO project_links (project_id,kind,label,url) VALUES (?,?,?,?)",
      ).bind(
        projectId,
        kind,
        String(link.label || "Link").slice(0, 120),
        String(link.url).trim(),
      ),
    );
  }
  for (const item of resources as Row[]) {
    if (!String(item?.title || "").trim()) continue;
    const kind = resourceKinds.has(String(item.kind).toLowerCase())
      ? String(item.kind).toLowerCase()
      : "other";
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO project_resources (project_id,client_id,kind,title,url,file_url,file_name,notes) VALUES (?,?,?,?,?,?,?,?)",
      ).bind(
        projectId,
        cid(c),
        kind,
        String(item.title).trim().slice(0, 200),
        item.url || null,
        item.file_url || null,
        item.file_name || null,
        item.notes || null,
      ),
    );
  }
  statements.push(
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','New client project',?,'/projects')",
    ).bind(`${c.get("client")!.name} created: ${name}`),
  );
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ success: true, id: projectId }, 201);
});

app.get("/projects/:id", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  const [links, resources, counts, activity] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT id,kind,label,url FROM project_links WHERE project_id=? ORDER BY id",
    ).bind(row.id),
    c.env.DB.prepare(
      "SELECT id,kind,title,url,file_url,file_name,notes,created_at FROM project_resources WHERE project_id=? ORDER BY created_at DESC",
    ).bind(row.id),
    c.env.DB.prepare(
      `SELECT SUM(status IN ('in_progress','revision')) AS inProgress,SUM(status='in_review') AS needsReview,SUM(status='queue') AS upNext,SUM(status='completed') AS delivered FROM requests WHERE project_id=? AND client_id=? AND request_kind!='parent'`,
    ).bind(row.id, cid(c)),
    c.env.DB.prepare(
      `SELECT * FROM (SELECT 'request_created' AS kind,r.title AS subject,r.created_at AS at FROM requests r WHERE r.project_id=? UNION ALL SELECT 'request_delivered',r.title,r.completed_at FROM requests r WHERE r.project_id=? AND r.completed_at IS NOT NULL UNION ALL SELECT 'comment',r.title,rc.created_at FROM request_comments rc JOIN requests r ON r.id=rc.request_id WHERE r.project_id=? AND rc.visibility='client' UNION ALL SELECT 'file',f.file_name,f.created_at FROM files f WHERE f.project_id=? UNION ALL SELECT 'message',substr(m.content,1,80),m.created_at FROM client_messages m WHERE m.project_id=?) ORDER BY at DESC LIMIT 12`,
    ).bind(row.id, row.id, row.id, row.id, row.id),
  ]);
  const tally = (counts!.results[0] || {}) as Row;
  return c.json({
    success: true,
    project: {
      ...portalProject(row),
      links: links!.results,
      resources: resources!.results,
    },
    summary: {
      inProgress: Number(tally.inProgress || 0),
      needsReview: Number(tally.needsReview || 0),
      upNext: Number(tally.upNext || 0),
      delivered: Number(tally.delivered || 0),
    },
    activity: activity!.results
      .filter((item: any) => item.at)
      .map((item: any) => ({ ...item, at: shortDate(item.at) })),
  });
});

app.patch("/projects/:id", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  const b = await body(c);
  await c.env.DB.prepare(
    `UPDATE projects SET name=COALESCE(?,name),type=COALESCE(?,type),icon_emoji=COALESCE(?,icon_emoji),logo_url=COALESCE(?,logo_url),notes=COALESCE(?,notes),goal=COALESCE(?,goal),audience=COALESCE(?,audience),success_measure=COALESCE(?,success_measure),due_date=COALESCE(?,due_date) WHERE id=?`,
  )
    .bind(
      String(b.name || "").trim() || null,
      b.type || null,
      b.icon || null,
      b.logo_url || null,
      b.description ?? null,
      b.goal ?? null,
      b.audience ?? null,
      b.success_measure ?? null,
      b.target_date || null,
      row.id,
    )
    .run();
  return c.json({ success: true });
});

app.delete("/projects/:id", requireClient, async (c) => {
  const role = await c.env.DB.prepare(
    "SELECT portal_role FROM clients WHERE id=?",
  )
    .bind(cid(c))
    .first<{ portal_role: string }>();
  if (role?.portal_role !== "admin")
    return c.json(
      { success: false, message: "Client administrator access required" },
      403,
    );
  const project = await deleteProjectTree(
    c.env.DB,
    Number(c.req.param("id")),
    cid(c),
  );
  if (!project)
    return c.json({ success: false, message: "Project not found" }, 404);
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Project deleted by client administrator',?,'/clients')",
  )
    .bind(`${c.get("client")!.name} deleted ${project.name}`)
    .run();
  return c.json({
    success: true,
    project: { id: project.id, name: project.name },
  });
});

app.post("/projects/:id/links", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  const b = await body(c);
  const url = String(b.url || "").trim();
  if (!url) return c.json({ success: false, message: "url required" }, 400);
  const allowed = new Set([
    "production",
    "staging",
    "figma",
    "github",
    "appstore",
    "docs",
    "prototype",
    "other",
  ]);
  const kind = allowed.has(String(b.kind || "").toLowerCase())
    ? String(b.kind).toLowerCase()
    : "other";
  const label = String(b.label || "Link").slice(0, 120);
  const result = await c.env.DB.prepare(
    "INSERT INTO project_links (project_id,kind,label,url) VALUES (?,?,?,?)",
  )
    .bind(row.id, kind, label, url)
    .run();
  return c.json(
    {
      success: true,
      link: { id: result.meta.last_row_id, kind, label, url },
    },
    201,
  );
});

app.delete("/projects/:id/links/:linkId", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  await c.env.DB.prepare(
    "DELETE FROM project_links WHERE id=? AND project_id=?",
  )
    .bind(c.req.param("linkId"), row.id)
    .run();
  return c.json({ success: true });
});

app.post("/projects/:id/resources", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  const b = await body(c);
  const title = String(b.title || "").trim();
  if (!title) return c.json({ success: false, message: "title required" }, 400);
  if (!String(b.url || "").trim() && !b.file_url)
    return c.json(
      { success: false, message: "a link or a file is required" },
      400,
    );
  const allowed = new Set([
    "brand",
    "website",
    "requirements",
    "competitor",
    "figma",
    "drive",
    "research",
    "other",
  ]);
  const kind = allowed.has(String(b.kind || "").toLowerCase())
    ? String(b.kind).toLowerCase()
    : "other";
  const result = await c.env.DB.prepare(
    "INSERT INTO project_resources (project_id,client_id,kind,title,url,file_url,file_name,notes) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      row.id,
      cid(c),
      kind,
      title.slice(0, 200),
      String(b.url || "").trim() || null,
      b.file_url || null,
      b.file_name || null,
      b.notes || null,
    )
    .run();
  const resource = await c.env.DB.prepare(
    "SELECT id,kind,title,url,file_url,file_name,notes,created_at FROM project_resources WHERE id=?",
  )
    .bind(result.meta.last_row_id)
    .first();
  return c.json({ success: true, resource }, 201);
});

app.delete("/projects/:id/resources/:resourceId", requireClient, async (c) => {
  const row = await ownedProject(c, c.req.param("id"));
  if (!row)
    return c.json({ success: false, message: "Project not found" }, 404);
  await c.env.DB.prepare(
    "DELETE FROM project_resources WHERE id=? AND project_id=?",
  )
    .bind(c.req.param("resourceId"), row.id)
    .run();
  return c.json({ success: true });
});

app.get("/invoices", requireClient, async (c) => {
  const email = c.get("client")!.email;
  const [invoices, paid, pending] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT id,plan,billing,amount,fee_usd,received_usd,status,submitted_at,confirmed_at FROM payments WHERE email=? ORDER BY submitted_at DESC",
    ).bind(email),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE email=? AND status='confirmed'",
    ).bind(email),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total_pending FROM payments WHERE email=? AND status='pending'",
    ).bind(email),
  ]);
  return c.json({
    success: true,
    invoices: invoices!.results,
    total_paid: (paid!.results[0] as Row)?.total_paid || 0,
    total_pending: (pending!.results[0] as Row)?.total_pending || 0,
  });
});

app.get("/tickets", requireClient, async (c) => {
  const rows = (
    await c.env.DB.prepare(
      "SELECT id,subject,category,priority,status,created_at,updated_at FROM client_tickets WHERE client_id=? ORDER BY created_at DESC",
    )
      .bind(cid(c))
      .all()
  ).results;
  return c.json({ success: true, tickets: rows });
});
app.post("/tickets", requireClient, async (c) => {
  const b = await body(c);
  if (!b.subject || !b.category || !b.description)
    return c.json(
      {
        success: false,
        message: "subject, category, description required",
      },
      400,
    );
  const result = await c.env.DB.prepare(
    "INSERT INTO client_tickets (client_id,subject,category,priority,description) VALUES (?,?,?,?,?)",
  )
    .bind(cid(c), b.subject, b.category, b.priority || "Normal", b.description)
    .run();
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('support','New client ticket',?,'/clients')",
  )
    .bind(`${c.get("client")!.name} opened: ${b.subject}`)
    .run();
  return c.json({ success: true, id: result.meta.last_row_id });
});
app.get("/tickets/:id", requireClient, async (c) => {
  const ticket = await c.env.DB.prepare(
    "SELECT * FROM client_tickets WHERE id=? AND client_id=?",
  )
    .bind(c.req.param("id"), cid(c))
    .first();
  if (!ticket)
    return c.json({ success: false, message: "Ticket not found" }, 404);
  const replies = (
    await c.env.DB.prepare(
      "SELECT * FROM client_ticket_replies WHERE ticket_id=? ORDER BY created_at",
    )
      .bind(c.req.param("id"))
      .all()
  ).results;
  return c.json({ success: true, ticket, replies });
});
app.post("/tickets/:id/reply", requireClient, async (c) => {
  const b = await body(c);
  if (!b.message)
    return c.json({ success: false, message: "message required" }, 400);
  const ticket = await c.env.DB.prepare(
    "SELECT id FROM client_tickets WHERE id=? AND client_id=?",
  )
    .bind(c.req.param("id"), cid(c))
    .first();
  if (!ticket)
    return c.json({ success: false, message: "Ticket not found" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO client_ticket_replies (ticket_id,sender,message) VALUES (?,'client',?)",
    ).bind(c.req.param("id"), b.message),
    c.env.DB.prepare(
      "UPDATE client_tickets SET status='Open',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(c.req.param("id")),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('support','Client replied to a ticket',?,'/clients')",
    ).bind(`${c.get("client")!.name}: ${String(b.message).slice(0, 110)}`),
  ]);
  return c.json({ success: true });
});

app.get("/files", requireClient, async (c) => {
  const rows = (
    await c.env.DB.prepare(
      `SELECT f.id,f.file_name AS name,f.file_url,f.file_type,f.category,f.created_at,p.name AS project_name FROM files f LEFT JOIN projects p ON p.id=f.project_id WHERE p.client_id=? OR f.client_id=? ORDER BY f.created_at DESC`,
    )
      .bind(cid(c), cid(c))
      .all()
  ).results;
  return c.json({ success: true, files: rows });
});
app.get("/messages", requireClient, async (c) => {
  const projectId = c.req.query("project_id")
    ? Number(c.req.query("project_id"))
    : null;
  const feed = await getClientMessageFeed(c.env.DB, cid(c), projectId);
  return feed
    ? c.json({ success: true, messages: feed.messages })
    : c.json({ success: false, message: "Conversation not found" }, 404);
});
app.post("/messages", requireClient, async (c) => {
  const b = await body(c);
  const content = String(b.content || "").trim();
  if (!content && !(Array.isArray(b.attachments) && b.attachments.length))
    return c.json(
      { success: false, message: "content or attachments required" },
      400,
    );
  let projectId: number | null = null;
  if (b.project_id) {
    const project = await ownedProject(c, b.project_id);
    if (!project)
      return c.json(
        { success: false, message: "Project not found for this account" },
        403,
      );
    projectId = Number(project.id);
  }
  const result = await c.env.DB.prepare(
    "INSERT INTO client_messages (client_id,project_id,sender,content) VALUES (?,?,'client',?)",
  )
    .bind(cid(c), projectId, content)
    .run();
  const messageId = Number(result.meta.last_row_id);
  const saved = await saveClientAttachments(c.env.DB, {
    clientId: cid(c),
    projectId,
    messageId,
    attachments: b.attachments,
  });
  const message = (await c.env.DB.prepare(
    "SELECT * FROM client_messages WHERE id=?",
  )
    .bind(messageId)
    .first<Row>())!;
  message.attachments = saved.map((file) => ({
    id: file.id,
    name: file.name,
    url: file.url,
    mime: file.file_type,
  }));
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('message','New client message',?,'/clients')",
  )
    .bind(`${c.get("client")!.name}: ${content.slice(0, 120)}`)
    .run();
  return c.json({ success: true, message });
});

app.post("/uploads", requireClient, async (c) => {
  const form = await c.req.raw.formData();
  const value: unknown = form.get("file");
  if (!(value instanceof File))
    return c.json({ success: false, message: "No file provided" }, 400);
  if (!isAllowedMime(value.type))
    return c.json(
      { success: false, message: "That file type is not supported." },
      400,
    );
  if (value.size > MAX_UPLOAD_BYTES)
    return c.json({ success: false, message: "File too large" }, 413);
  const key = `clients/${cid(c)}/${Date.now()}-${safeKey(value.name)}`;
  return c.json({
    success: true,
    url: await putR2(c.env, key, await value.arrayBuffer(), value.type),
    name: value.name,
    size: value.size,
    mime: value.type,
  });
});

app.put("/notifications", requireClient, async (c) => {
  const b = await body(c);
  const prefs: Row = {};
  for (const key of [
    "delivery_ready",
    "team_message",
    "billing_activity",
    "weekly_summary",
  ])
    prefs[key] = !!b[key];
  await c.env.DB.prepare("UPDATE clients SET notify_prefs=? WHERE id=?")
    .bind(JSON.stringify(prefs), cid(c))
    .run();
  return c.json({ success: true, notify_prefs: prefs });
});

app.get("/contacts", requireClient, async (c) => {
  const contacts = (
    await c.env.DB.prepare(
      "SELECT id,name,email,role,can_approve,can_bill FROM client_contacts WHERE client_id=? ORDER BY id",
    )
      .bind(cid(c))
      .all()
  ).results;
  return c.json({ success: true, contacts });
});
app.post("/contacts", requireClient, async (c) => {
  const b = await body(c);
  const email = String(b.email || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@"))
    return c.json(
      { success: false, message: "A valid email is required" },
      400,
    );
  const existing = await c.env.DB.prepare(
    "SELECT id FROM client_contacts WHERE client_id=? AND email=?",
  )
    .bind(cid(c), email)
    .first();
  if (existing)
    return c.json(
      {
        success: false,
        message: "That person is already on your workspace.",
      },
      409,
    );
  const result = await c.env.DB.prepare(
    "INSERT INTO client_contacts (client_id,name,email,role,can_approve,can_bill) VALUES (?,?,?,?,?,?)",
  )
    .bind(
      cid(c),
      String(b.name || email.split("@")[0]).slice(0, 160),
      email,
      b.role || "Team member",
      b.can_approve === false ? 0 : 1,
      b.can_bill ? 1 : 0,
    )
    .run();
  const contact = await c.env.DB.prepare(
    "SELECT id,name,email,role,can_approve,can_bill FROM client_contacts WHERE id=?",
  )
    .bind(result.meta.last_row_id)
    .first<Row>();
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Client added a contact',?,'/clients')",
  )
    .bind(`${c.get("client")!.name} added ${email} to their workspace`)
    .run();
  return c.json({ success: true, contact }, 201);
});
app.patch("/contacts/:id", requireClient, async (c) => {
  const b = await body(c);
  await c.env.DB.prepare(
    "UPDATE client_contacts SET can_approve=COALESCE(?,can_approve),can_bill=COALESCE(?,can_bill),role=COALESCE(?,role) WHERE id=? AND client_id=?",
  )
    .bind(
      b.can_approve === undefined ? null : b.can_approve ? 1 : 0,
      b.can_bill === undefined ? null : b.can_bill ? 1 : 0,
      b.role || null,
      c.req.param("id"),
      cid(c),
    )
    .run();
  return c.json({ success: true });
});
app.delete("/contacts/:id", requireClient, async (c) => {
  await c.env.DB.prepare(
    "DELETE FROM client_contacts WHERE id=? AND client_id=?",
  )
    .bind(c.req.param("id"), cid(c))
    .run();
  return c.json({ success: true });
});

const CALL_HOURS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];
app.get("/bookings/availability", requireClient, async (c) => {
  const days = Math.min(Number(c.req.query("days")) || 10, 21);
  const taken = (
    await c.env.DB.prepare(
      "SELECT booking_date,booking_time FROM bookings WHERE date(booking_date)>=date('now') AND status<>'cancelled'",
    ).all<Row>()
  ).results;
  const occupied = new Set(
    taken.map(
      (item) =>
        `${String(item.booking_date).split(/[T ]/)[0]} ${item.booking_time}`,
    ),
  );
  const slots: Array<{ date: string; times: string[] }> = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  while (slots.length < days) {
    if (![0, 6].includes(cursor.getDay())) {
      const date = cursor.toISOString().slice(0, 10);
      const times = CALL_HOURS.filter(
        (time) => !occupied.has(`${date} ${time}`),
      );
      if (times.length) slots.push({ date, times });
    }
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getTime() - Date.now() > 45 * 86_400_000) break;
  }
  return c.json({ success: true, slots });
});
app.get("/bookings", requireClient, async (c) => {
  const bookings = (
    await c.env.DB.prepare(
      "SELECT id,booking_date,booking_time,notes,status,zoom_link FROM bookings WHERE email=? AND date(booking_date)>=date('now') AND status<>'cancelled' ORDER BY booking_date,booking_time",
    )
      .bind(c.get("client")!.email)
      .all()
  ).results;
  return c.json({ success: true, bookings });
});
app.post("/bookings", requireClient, async (c) => {
  const b = await body(c);
  if (!b.date || !b.time)
    return c.json({ success: false, message: "date and time required" }, 400);
  if (!CALL_HOURS.includes(String(b.time)))
    return c.json(
      { success: false, message: "That time is not available" },
      400,
    );
  const clash = await c.env.DB.prepare(
    "SELECT id FROM bookings WHERE booking_date=? AND booking_time=? AND status<>'cancelled'",
  )
    .bind(b.date, b.time)
    .first();
  if (clash)
    return c.json(
      { success: false, message: "That slot was just taken. Pick another." },
      409,
    );
  let projectName: string | null = null;
  if (b.project_id)
    projectName = (await ownedProject(c, b.project_id))?.name || null;
  const client = await c.env.DB.prepare(
    "SELECT name,email,company FROM clients WHERE id=?",
  )
    .bind(cid(c))
    .first<Row>();
  const note =
    [projectName && `Project: ${projectName}`, String(b.notes || "").trim()]
      .filter(Boolean)
      .join(" — ") || "Call requested from the client portal";
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO bookings (id,name,email,company,booking_date,booking_time,notes,status) VALUES (?,?,?,?,?,?,?,'confirmed')",
    ).bind(
      crypto.randomUUID(),
      client!.name,
      client!.email,
      client!.company || null,
      b.date,
      b.time,
      note,
    ),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('booking','Client booked a call',?,'/bookings')",
    ).bind(`${client!.name} booked ${b.date} at ${b.time}`),
  ]);
  return c.json({ success: true }, 201);
});

export default app;
