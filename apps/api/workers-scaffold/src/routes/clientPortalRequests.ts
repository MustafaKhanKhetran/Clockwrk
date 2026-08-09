import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";
import { requireClient } from "../middleware/auth";
import {
  addRequestActivity,
  approveBreakdown,
  loadBreakdown,
  nextQueuePosition,
  promoteNextQueued,
  reorderClientQueue,
  WorkflowError,
} from "../services/requestWorkflow";
import { saveClientAttachments } from "./clientPortalContent";

type App = { Bindings: Env; Variables: Variables };
type Ctx = Context<App>;
type Row = Record<string, any>;
const app = new Hono<App>();
const body = (c: Ctx): Promise<Row> => c.req.json<Row>().catch(() => ({}));
const cid = (c: Ctx) => c.get("client")!.id;
const STATUS: Row = {
  queue: "queued",
  in_progress: "active",
  in_review: "review",
  revision: "active",
  completed: "done",
};
const FILE_KIND: Row = {
  "application/pdf": "pdf",
  pdf: "pdf",
  figma: "figma",
  zip: "zip",
  html: "html",
  code: "code",
  svg: "svg",
  png: "png",
  jpg: "img",
  jpeg: "img",
  mp4: "video",
};
const fileKind = (row: Row) =>
  FILE_KIND[row.file_type] ||
  FILE_KIND[
    String(row.file_name || "")
      .split(".")
      .pop()!
      .toLowerCase()
  ] ||
  "file";
const shortDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const parentStatus = (row: Row, children: Row[]) => {
  if (["reviewing", "proposed"].includes(row.scope_status)) return "scope";
  if (!children.length) return "queued";
  if (children.every((child) => child.status === "completed")) return "done";
  if (children.some((child) => child.status === "in_review")) return "review";
  if (
    children.some((child) => ["in_progress", "revision"].includes(child.status))
  )
    return "active";
  return "queued";
};
const portalRequest = (
  row: Row,
  data: {
    comments?: Row[];
    deliverables?: Row[];
    attachments?: Row[];
    activities?: Row[];
    children?: Row[];
    breakdown?: Row[];
  } = {},
) => {
  const comments = data.comments || [];
  const deliverables = data.deliverables || [];
  const attachments = data.attachments || [];
  const activities = data.activities || [];
  const children = data.children || [];
  const breakdown = data.breakdown || [];
  const parent = row.request_kind === "parent";
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    brief: row.description,
    type: row.type,
    status: parent
      ? parentStatus(row, children)
      : STATUS[row.status] || "queued",
    dbStatus: row.status,
    requestKind: row.request_kind || "normal",
    isParent: parent,
    isChild: row.request_kind === "child",
    parentRequestId: row.parent_request_id,
    parentTitle: row.parent_title,
    scopeStatus: row.scope_status || "none",
    scopeActionRequired: parent && row.scope_status === "proposed",
    partNumber: row.part_number,
    partCount: parent
      ? children.length || breakdown.length
      : Number(row.part_count || 0),
    dependsOnRequestId: row.depends_on_request_id,
    dependsOnTitle: row.depends_on_title,
    dependencyComplete:
      !row.depends_on_request_id || row.depends_on_status === "completed",
    breakdownApprovedAt: row.breakdown_approved_at,
    priority: row.priority
      ? row.priority[0].toUpperCase() + row.priority.slice(1)
      : "Normal",
    progress: row.completion_percent ?? 0,
    due: shortDate(row.due_date),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    approvalStatus: row.approval_status,
    comments,
    deliverables,
    attachments,
    timeline: activities.map((item, index) => ({
      label: item.label,
      at: shortDate(item.created_at) || "Just now",
      done: index > 0,
      now: index === 0,
      eventType: item.event_type,
    })),
    changelog: [],
    revisionsUsed: activities.filter(
      (item) => item.event_type === "revision_requested",
    ).length,
    children: children.map((child) => ({
      id: child.id,
      title: child.title,
      status: STATUS[child.status] || "queued",
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
};
const owned = (c: Ctx, id: unknown) =>
  c.env.DB.prepare("SELECT * FROM requests WHERE id=? AND client_id=?")
    .bind(id, cid(c))
    .first<Row>();
const workflowFailure = (c: any, error: unknown) => {
  const message = error instanceof Error ? error.message : "Server error";
  const status = error instanceof WorkflowError ? error.status : 500;
  if (status === 400) return c.json({ success: false, message }, 400);
  if (status === 404) return c.json({ success: false, message }, 404);
  if (status === 409) return c.json({ success: false, message }, 409);
  return c.json({ success: false, message }, 500);
};

app.get("/requests", requireClient, async (c) => {
  const rows = (
    await c.env.DB.prepare(
      `SELECT r.*,p.name AS project_name,parent.title AS parent_title,dependency.title AS depends_on_title,dependency.status AS depends_on_status,(SELECT COUNT(*) FROM requests siblings WHERE siblings.parent_request_id=r.parent_request_id) AS part_count FROM requests r LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN requests parent ON parent.id=r.parent_request_id LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id WHERE r.client_id=? ORDER BY r.created_at DESC`,
    )
      .bind(cid(c))
      .all<Row>()
  ).results;
  if (!rows.length) return c.json({ success: true, requests: [] });
  const ids = rows.map((row) => Number(row.id));
  const placeholders = ids.map(() => "?").join(",");
  const [commentsResult, filesResult, activitiesResult] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT rc.request_id,rc.comment,rc.created_at,rc.client_id,e.name AS author FROM request_comments rc LEFT JOIN employees e ON e.id=rc.employee_id WHERE rc.request_id IN (${placeholders}) AND rc.visibility='client' ORDER BY rc.created_at`,
    ).bind(...ids),
    c.env.DB.prepare(
      `SELECT id,request_id,file_name,file_url,file_type,version,category,created_at FROM files WHERE request_id IN (${placeholders}) AND client_id=? ORDER BY created_at DESC`,
    ).bind(...ids, cid(c)),
    c.env.DB.prepare(
      `SELECT request_id,event_type,label,created_at FROM request_activity WHERE request_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`,
    ).bind(...ids),
  ]);
  const comments = commentsResult!.results as Row[];
  const files = filesResult!.results as Row[];
  const activities = activitiesResult!.results as Row[];
  const parentIds = rows
    .filter((row) => row.request_kind === "parent")
    .map((row) => Number(row.id));
  const breakdowns = await Promise.all(
    parentIds.map((id) => loadBreakdown(c.env.DB, id)),
  );
  const queue = rows
    .filter((row) => row.status === "queue" && row.request_kind !== "parent")
    .sort(
      (a, b) =>
        Number(a.queue_position || Number.MAX_SAFE_INTEGER) -
        Number(b.queue_position || Number.MAX_SAFE_INTEGER),
    );
  const queueOrder = new Map(
    queue.map((row, index) => [Number(row.id), index + 1]),
  );
  const requests = rows.map((row) => {
    const requestFiles = files.filter(
      (file) => Number(file.request_id) === Number(row.id),
    );
    return {
      ...portalRequest(row, {
        comments: comments
          .filter((item) => Number(item.request_id) === Number(row.id))
          .map((item) => ({
            who: item.client_id ? "You" : item.author || "Clockwrk",
            at: shortDate(item.created_at),
            text: item.comment,
          })),
        deliverables: requestFiles
          .filter((file) => file.category !== "attachment")
          .map((file, index) => ({
            id: file.id,
            name: file.file_name,
            url: file.file_url,
            kind: fileKind(file),
            version: file.version || 1,
            at: shortDate(file.created_at),
            current: index === 0,
          })),
        attachments: requestFiles
          .filter((file) => file.category === "attachment")
          .map((file) => ({
            id: file.id,
            name: file.file_name,
            url: file.file_url,
            mime: file.file_type,
            at: shortDate(file.created_at),
          })),
        activities: activities.filter(
          (item) => Number(item.request_id) === Number(row.id),
        ),
        children: rows.filter(
          (child) => Number(child.parent_request_id) === Number(row.id),
        ),
        breakdown: parentIds.includes(Number(row.id))
          ? breakdowns[parentIds.indexOf(Number(row.id))]
          : [],
      }),
      queuePos: queueOrder.get(Number(row.id)) || 0,
    };
  });
  return c.json({ success: true, requests });
});

app.post("/requests", requireClient, async (c) => {
  const b = await body(c);
  const title = String(b.title || "").trim();
  if (!title) return c.json({ success: false, message: "title required" }, 400);
  if (!b.project_id)
    return c.json({ success: false, message: "project_id required" }, 400);
  const project = await c.env.DB.prepare(
    "SELECT id FROM projects WHERE id=? AND client_id=?",
  )
    .bind(b.project_id, cid(c))
    .first();
  if (!project)
    return c.json(
      { success: false, message: "Project not found for this account" },
      403,
    );
  const priority = ["low", "normal", "high", "urgent"].includes(
    String(b.priority).toLowerCase(),
  )
    ? String(b.priority).toLowerCase()
    : "normal";
  const position = await nextQueuePosition(c.env.DB, cid(c));
  const result = await c.env.DB.prepare(
    `INSERT INTO requests (project_id,client_id,title,description,type,status,priority,request_kind,scope_status,queue_position) VALUES (?,?,?,?,?,'queue',?,'normal','none',?)`,
  )
    .bind(
      b.project_id,
      cid(c),
      title,
      String(b.description || "").trim() || null,
      b.type || null,
      priority,
      position,
    )
    .run();
  const requestId = Number(result.meta.last_row_id);
  await addRequestActivity(
    c.env.DB,
    requestId,
    "request_submitted",
    "Request submitted",
    { actorType: "client", actorId: cid(c) },
  );
  const attachments = await saveClientAttachments(c.env.DB, {
    clientId: cid(c),
    projectId: Number(b.project_id),
    requestId,
    attachments: b.attachments,
  });
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','New client request',?,'/requests')",
  )
    .bind(
      `${c.get("client")!.name}: ${title}${attachments.length ? ` (${attachments.length} file${attachments.length === 1 ? "" : "s"} attached)` : ""}`,
    )
    .run();
  const row = await c.env.DB.prepare(
    "SELECT r.*,p.name AS project_name FROM requests r LEFT JOIN projects p ON p.id=r.project_id WHERE r.id=?",
  )
    .bind(requestId)
    .first<Row>();
  return c.json(
    {
      success: true,
      request: portalRequest(row!, {
        attachments: attachments.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          mime: file.file_type,
        })),
      }),
    },
    201,
  );
});

app.put("/requests/queue", requireClient, async (c) => {
  try {
    const ids = await reorderClientQueue(c.env.DB, {
      clientId: cid(c),
      orderedIds: (await body(c)).ordered_ids || [],
    });
    return c.json({ success: true, ordered_ids: ids });
  } catch (error) {
    return workflowFailure(c, error);
  }
});

app.get("/requests/:id/breakdown", requireClient, async (c) => {
  const request = await owned(c, c.req.param("id"));
  if (!request)
    return c.json({ success: false, message: "Request not found" }, 404);
  if (request.request_kind !== "parent")
    return c.json(
      { success: false, message: "This request does not have a breakdown" },
      409,
    );
  return c.json({
    success: true,
    parts: await loadBreakdown(c.env.DB, Number(request.id)),
  });
});

app.post("/requests/:id/breakdown/approve", requireClient, async (c) => {
  try {
    const result = await approveBreakdown(c.env.DB, {
      parentRequestId: Number(c.req.param("id")),
      clientId: cid(c),
    });
    const promoted = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const next = await promoteNextQueued(c.env.DB, cid(c));
      if (!next) break;
      promoted.push(next);
    }
    await c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Request breakdown approved',?,'/requests')",
    )
      .bind(
        `${c.get("client")!.name} approved ${result.children.length} linked requests`,
      )
      .run();
    return c.json({ success: true, ...result, promoted });
  } catch (error) {
    return workflowFailure(c, error);
  }
});

app.post("/requests/:id/approve", requireClient, async (c) => {
  const request = await owned(c, c.req.param("id"));
  if (!request)
    return c.json({ success: false, message: "Request not found" }, 404);
  if (request.request_kind === "parent")
    return c.json(
      {
        success: false,
        message: "Approve the request breakdown from the group overview.",
      },
      409,
    );
  if (request.status === "completed")
    return c.json({ success: false, message: "Already approved" }, 409);
  await c.env.DB.prepare(
    "UPDATE requests SET status='completed',approval_status='approved',completed_at=CURRENT_TIMESTAMP,completion_percent=100 WHERE id=?",
  )
    .bind(request.id)
    .run();
  await addRequestActivity(
    c.env.DB,
    Number(request.id),
    "delivery_approved",
    "Delivery approved",
    { actorType: "client", actorId: cid(c) },
  );
  const promoted = await promoteNextQueued(c.env.DB, cid(c));
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Delivery approved',?,'/requests')",
  )
    .bind(`${c.get("client")!.name} approved: ${request.title}`)
    .run();
  return c.json({ success: true, promoted: promoted?.title || null });
});

app.post("/requests/:id/revision", requireClient, async (c) => {
  const note = String((await body(c)).note || "").trim();
  if (!note) return c.json({ success: false, message: "note required" }, 400);
  const request = await owned(c, c.req.param("id"));
  if (!request)
    return c.json({ success: false, message: "Request not found" }, 404);
  if (request.request_kind === "parent")
    return c.json(
      {
        success: false,
        message: "Discuss the breakdown from the request group.",
      },
      409,
    );
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE requests SET status='revision',approval_status='rejected',revision_notes=? WHERE id=?",
    ).bind(note, request.id),
    c.env.DB.prepare(
      "INSERT INTO request_comments (request_id,client_id,comment,visibility) VALUES (?,?,?,'client')",
    ).bind(request.id, cid(c), note),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('support','Changes requested',?,'/requests')",
    ).bind(
      `${c.get("client")!.name} on "${request.title}": ${note.slice(0, 100)}`,
    ),
  ]);
  await addRequestActivity(
    c.env.DB,
    Number(request.id),
    "revision_requested",
    "Changes requested",
    { actorType: "client", actorId: cid(c) },
  );
  return c.json({ success: true });
});

app.post("/requests/:id/comments", requireClient, async (c) => {
  const text = String((await body(c)).text || "").trim();
  if (!text) return c.json({ success: false, message: "text required" }, 400);
  const request = await owned(c, c.req.param("id"));
  if (!request)
    return c.json({ success: false, message: "Request not found" }, 404);
  const result = await c.env.DB.prepare(
    "INSERT INTO request_comments (request_id,client_id,comment,visibility) VALUES (?,?,?,'client')",
  )
    .bind(request.id, cid(c), text)
    .run();
  await addRequestActivity(
    c.env.DB,
    Number(request.id),
    "client_comment",
    "Client added a comment",
    { actorType: "client", actorId: cid(c) },
  );
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('message','New request comment',?,'/requests')",
  )
    .bind(
      `${c.get("client")!.name} on "${request.title}": ${text.slice(0, 100)}`,
    )
    .run();
  return c.json(
    {
      success: true,
      comment: {
        id: result.meta.last_row_id,
        who: "You",
        at: "Just now",
        text,
      },
    },
    201,
  );
});

export default app;
