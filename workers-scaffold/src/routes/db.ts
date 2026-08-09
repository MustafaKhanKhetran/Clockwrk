// /api/db — DB browser + raw-SQL endpoint for the owner. Owner-only.
// Source: Express routes/db.js (~291 lines).
//
// MySQL used INFORMATION_SCHEMA. SQLite uses sqlite_master + PRAGMA.
// This is a partial port — the raw /query endpoint is the security-critical
// one; the table browser can be filled in from the pattern.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireOwner } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// All /api/db routes are owner-only.
app.use('*', requireEmployee, requireOwner);

const safeName = (s: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);

// GET /api/db/tables
app.get('/tables', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`
  ).all();
  return c.json({ success: true, tables: results });
});

// GET /api/db/tables/:table/schema
app.get('/tables/:table/schema', async (c) => {
  const table = c.req.param('table');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);
  const { results: columns } = await c.env.DB.prepare(`PRAGMA table_info("${table}")`).all();
  const { results: indexes } = await c.env.DB.prepare(`PRAGMA index_list("${table}")`).all();
  return c.json({ success: true, columns, indexes });
});

// POST /api/db/query
app.post('/query', async (c) => {
  if (c.env.ALLOW_RAW_SQL !== 'true') {
    return c.json({ success: false, message: 'Raw SQL is disabled on this server.' }, 403);
  }
  const { query: sql } = await c.req.json().catch(() => ({})) as { query?: string };
  if (!sql) return c.json({ success: false, message: 'Query required' }, 400);
  const emp = c.get('employee')!;
  console.warn(`[db/query] employee=${emp.id} email=${emp.email} sql=${sql.slice(0, 500)}`);
  try {
    const { results } = await c.env.DB.prepare(sql).all();
    return c.json({ success: true, data: results });
  } catch (err) {
    return c.json({ success: false, message: (err as Error).message }, 400);
  }
});

// TODO: port /tables/:table/rows (paginated), row CRUD, column add/drop.

export default app;
