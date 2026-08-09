// /api/files — R2 uploads, records CRUD, CV upload. Skeleton.
// Source: Express routes/files.js (~230 lines).
//
// Endpoints to port:
//   GET    /                       (list objects under prefix — env.R2.list)
//   POST   /upload                 (multipart file → R2 + files row; use readUpload)
//   POST   /request-upload         (client-scoped path: clients/{id}/requests/{rid}/...)
//   GET    /records                (files table with joins)
//   PATCH  /records/:id            (whitelist: file_name, category, version, notes)
//   DELETE /records/:id            (delete R2 object + row)
//   GET    /url?key=               (public URL builder)
//   DELETE /?key=                  (owner/admin — arbitrary object delete)
//   POST   /folder                 (zero-byte placeholder)
//   POST   /cv-upload              (PUBLIC — rate-limited, CORS *)
//
// Security notes preserved from the audit:
//   • SVG is NOT in the mime allowlist (see lib/uploads.ts)
//   • DELETE /?key= is owner/admin only
//   • /cv-upload uses ipRateLimit at 10/hour

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';
import { ipRateLimit } from '../middleware/rateLimit';
import { readUpload, isAllowedMime, MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES_INTERNAL, safeKey, putR2, deleteR2 } from '../lib/uploads';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const publicUploadLimit = ipRateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'cv-upload' });

app.delete('/', requireEmployee, requireRoles('owner', 'admin'), async (c) => {
  const key = c.req.query('key');
  if (!key) return c.json({ success: false, message: 'key required' }, 400);
  await deleteR2(c.env, key);
  return c.json({ success: true });
});

app.post('/cv-upload', publicUploadLimit, async (c) => {
  const files = await readUpload(c.req.raw, 'cv');
  if (files.length === 0) return c.json({ success: false, message: 'No file provided' }, 400);
  const f = files[0]!;
  if (f.size > MAX_UPLOAD_BYTES_INTERNAL) return c.json({ success: false, message: 'File too large' }, 413);
  if (!isAllowedMime(f.type)) return c.json({ success: false, message: 'File type not allowed' }, 400);
  const date = new Date().toISOString().slice(0, 7);
  const applicant = safeKey(String((await c.req.formData()).get('applicant_name') || 'applicant').toLowerCase().replace(/\s+/g, '-'));
  const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
  const key = `cvs/${date}/${applicant}-${Date.now()}.${ext}`;
  const url = await putR2(c.env, key, await f.arrayBuffer(), f.type);
  return c.json({ success: true, key, url });
});

// TODO: port GET /, POST /upload, /request-upload, /records CRUD, /url, /folder.

export default app;
