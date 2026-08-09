import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee, requireRoles } from "../middleware/auth";
import { ipRateLimit } from "../middleware/rateLimit";
import {
  deleteR2,
  isAllowedMime,
  MAX_UPLOAD_BYTES_INTERNAL,
  putR2,
  safeKey,
} from "../lib/uploads";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const cvLimit = ipRateLimit({
  windowMs: 3_600_000,
  max: 10,
  keyPrefix: "cv-upload",
});
const sizeLabel = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1_048_576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1_048_576).toFixed(1)} MB`;
function uploadFrom(form: FormData, field: string) {
  const value = form.get(field);
  return typeof value === "object" && value !== null && "arrayBuffer" in value
    ? (value as File)
    : null;
}
async function validate(file: File) {
  if (file.size > MAX_UPLOAD_BYTES_INTERNAL) return "File too large";
  if (!isAllowedMime(file.type)) return "File type not allowed";
  return null;
}

app.get("/", requireEmployee, async (c) => {
  const folder = (c.req.query("folder") || "").replace(/\/$/, "");
  const prefix = folder ? `${folder}/` : "";
  const listing = await c.env.R2.list({ prefix, delimiter: "/" });
  const folders = (listing.delimitedPrefixes ?? []).map((path) => ({
    type: "folder",
    name: path.replace(prefix, "").replace("/", ""),
    path,
  }));
  const files = listing.objects
    .filter((object) => object.key !== prefix)
    .map((object) => ({
      type: "file",
      key: object.key,
      name: object.key.split("/").pop(),
      path: object.key,
      size: object.size,
      size_label: sizeLabel(object.size),
      last_modified: object.uploaded,
      url: `${c.env.R2_PUBLIC_URL}/${object.key}`,
    }));
  return c.json({ success: true, folders, files, prefix });
});
app.post("/upload", requireEmployee, async (c) => {
  const form = await c.req.raw.formData();
  const file = uploadFrom(form, "file");
  if (!file)
    return c.json({ success: false, message: "No file provided" }, 400);
  const error = await validate(file);
  if (error)
    return c.json(
      { success: false, message: error },
      error === "File too large" ? 413 : 400,
    );
  const folder = (c.req.query("folder") || "internal").replace(/\/$/, "");
  const key = `${folder}/${Date.now()}-${safeKey(file.name)}`;
  const url = await putR2(c.env, key, await file.arrayBuffer(), file.type);
  return c.json({
    success: true,
    key,
    name: file.name,
    size: file.size,
    size_label: sizeLabel(file.size),
    mime: file.type,
    url,
  });
});
app.post("/request-upload", requireEmployee, async (c) => {
  const form = await c.req.raw.formData();
  const file = uploadFrom(form, "file");
  if (!file)
    return c.json({ success: false, message: "No file provided" }, 400);
  const error = await validate(file);
  if (error)
    return c.json(
      { success: false, message: error },
      error === "File too large" ? 413 : 400,
    );
  const requestId = Number(form.get("request_id"));
  if (!requestId)
    return c.json({ success: false, message: "request_id is required" }, 400);
  const request = await c.env.DB.prepare(
    "SELECT id,client_id,project_id FROM requests WHERE id=?",
  )
    .bind(requestId)
    .first<{ id: number; client_id: number; project_id: number }>();
  if (!request)
    return c.json({ success: false, message: "Request not found" }, 404);
  const key = `clients/${request.client_id}/requests/${request.id}/${Date.now()}-${safeKey(file.name)}`;
  const url = await putR2(c.env, key, await file.arrayBuffer(), file.type);
  const result = await c.env.DB.prepare(
    "INSERT INTO files (client_id,project_id,request_id,uploaded_by,file_name,file_url,file_type,category,version,notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      request.client_id,
      request.project_id,
      request.id,
      c.get("employee")!.id,
      file.name,
      url,
      file.type,
      String(form.get("category") || "deliverable"),
      String(form.get("version") || "Latest"),
      form.get("notes") || null,
    )
    .run();
  return c.json({
    success: true,
    file: await c.env.DB.prepare("SELECT * FROM files WHERE id=?")
      .bind(result.meta.last_row_id)
      .first(),
  });
});
app.get("/records", requireEmployee, async (c) => {
  let sql =
    "SELECT f.*,c.company AS client_company,p.name AS project_name,r.title AS request_title,e.name AS uploaded_by_name FROM files f LEFT JOIN clients c ON c.id=f.client_id LEFT JOIN projects p ON p.id=f.project_id LEFT JOIN requests r ON r.id=f.request_id LEFT JOIN employees e ON e.id=f.uploaded_by";
  const where: string[] = [];
  const params: unknown[] = [];
  for (const [query, column] of [
    ["client_id", "f.client_id"],
    ["project_id", "f.project_id"],
    ["request_id", "f.request_id"],
  ] as const) {
    const value = c.req.query(query);
    if (value) {
      where.push(`${column}=?`);
      params.push(value);
    }
  }
  const search = c.req.query("search");
  if (search) {
    where.push("(f.file_name LIKE ? OR p.name LIKE ? OR r.title LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY f.created_at DESC LIMIT 250";
  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all();
  return c.json({ success: true, files: results });
});
app.patch("/records/:id", requireEmployee, async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const key of ["file_name", "category", "version", "notes"])
    if (b[key] !== undefined) {
      fields.push(`${key}=?`);
      params.push(b[key]);
    }
  if (!fields.length)
    return c.json({ success: false, message: "No fields to update" }, 400);
  await c.env.DB.prepare(`UPDATE files SET ${fields.join(",")} WHERE id=?`)
    .bind(...params, c.req.param("id"))
    .run();
  return c.json({
    success: true,
    file: await c.env.DB.prepare("SELECT * FROM files WHERE id=?")
      .bind(c.req.param("id"))
      .first(),
  });
});
app.delete("/records/:id", requireEmployee, async (c) => {
  const file = await c.env.DB.prepare("SELECT * FROM files WHERE id=?")
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>();
  if (!file) return c.json({ success: false, message: "File not found" }, 404);
  const prefix = `${c.env.R2_PUBLIC_URL}/`;
  if (String(file.file_url || "").startsWith(prefix))
    await deleteR2(
      c.env,
      decodeURIComponent(String(file.file_url).slice(prefix.length)),
    );
  await c.env.DB.prepare("DELETE FROM files WHERE id=?").bind(file.id).run();
  return c.json({ success: true });
});
app.get("/url", requireEmployee, async (c) => {
  const key = c.req.query("key");
  return key
    ? c.json({ success: true, url: `${c.env.R2_PUBLIC_URL}/${key}` })
    : c.json({ success: false, message: "key required" }, 400);
});
app.delete("/", requireEmployee, requireRoles("owner", "admin"), async (c) => {
  const key = c.req.query("key");
  if (!key) return c.json({ success: false, message: "key required" }, 400);
  await deleteR2(c.env, key);
  return c.json({ success: true });
});
app.post("/folder", requireEmployee, async (c) => {
  const b = await c.req.json<{ path?: string }>();
  if (!b.path) return c.json({ success: false, message: "path required" }, 400);
  const key = `${b.path.replace(/\/$/, "")}/`;
  await c.env.R2.put(key, "", {
    httpMetadata: { contentType: "application/x-directory" },
  });
  return c.json({ success: true, key });
});
app.post("/cv-upload", cvLimit, async (c) => {
  const form = await c.req.raw.formData();
  const file = uploadFrom(form, "cv");
  if (!file)
    return c.json({ success: false, message: "No file provided" }, 400);
  const error = await validate(file);
  if (error)
    return c.json(
      { success: false, message: error },
      error === "File too large" ? 413 : 400,
    );
  const applicant = safeKey(
    String(form.get("applicant_name") || "applicant")
      .toLowerCase()
      .replace(/\s+/g, "-"),
  );
  const extension = (file.name.split(".").pop() || "bin").toLowerCase();
  const key = `cvs/${new Date().toISOString().slice(0, 7)}/${applicant}-${Date.now()}.${extension}`;
  return c.json({
    success: true,
    key,
    url: await putR2(c.env, key, await file.arrayBuffer(), file.type),
  });
});
export default app;
