import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireOwner } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', requireEmployee, requireOwner);

const safeName = (value: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
const quoteName = (value: string) => `"${value}"`;

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
};

type IndexInfo = {
  name: string;
  unique: number;
};

const bindValue = (value: unknown): string | number | null => {
  if (value === '' || value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
};

async function getColumns(db: D1Database, table: string): Promise<ColumnInfo[]> {
  const { results } = await db.prepare(`PRAGMA table_info(${quoteName(table)})`).all<ColumnInfo>();
  return results;
}

async function requireTable(db: D1Database, table: string): Promise<ColumnInfo[] | null> {
  if (!safeName(table)) return null;
  const columns = await getColumns(db, table);
  return columns.length ? columns : null;
}

app.get('/tables', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE '_cf_%'
       ORDER BY name ASC`
    ).all<{ name: string }>();

    const tables = await Promise.all(results.map(async ({ name }) => {
      const count = await c.env.DB.prepare(
        `SELECT COUNT(*) AS total FROM ${quoteName(name)}`
      ).first<{ total: number }>();
      return {
        name,
        approx_rows: Number(count?.total || 0),
        created_at: null,
        updated_at: null,
      };
    }));

    return c.json({ success: true, tables });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 500);
  }
});

app.get('/tables/:table/schema', async (c) => {
  const table = c.req.param('table');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);

  try {
    const rawColumns = await requireTable(c.env.DB, table);
    if (!rawColumns) return c.json({ success: false, message: 'Table not found' }, 404);

    const { results: rawIndexes } = await c.env.DB.prepare(
      `PRAGMA index_list(${quoteName(table)})`
    ).all<IndexInfo>();

    const indexes = (await Promise.all(rawIndexes.map(async (index) => {
      const { results } = await c.env.DB.prepare(
        `PRAGMA index_info(${quoteName(index.name)})`
      ).all<{ name: string }>();
      return results.map((column) => ({
        index_name: index.name,
        column_name: column.name,
        non_unique: index.unique ? 0 : 1,
      }));
    }))).flat();

    const columns = rawColumns.map((column) => ({
      name: column.name,
      type: column.type,
      nullable: column.notnull ? 'NO' : 'YES',
      default_value: column.dflt_value,
      key_type: column.pk ? 'PRI' : '',
      extra: '',
    }));

    return c.json({ success: true, columns, indexes });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 500);
  }
});

app.get('/tables/:table/rows', async (c) => {
  const table = c.req.param('table');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);

  const page = Math.max(1, Number.parseInt(c.req.query('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(c.req.query('limit') || '50', 10) || 50));
  const offset = (page - 1) * limit;
  const requestedSortColumn = c.req.query('sort_col');
  const sortDirection = c.req.query('sort_dir') === 'asc' ? 'ASC' : 'DESC';
  const search = c.req.query('search') || '';

  try {
    const columns = await requireTable(c.env.DB, table);
    if (!columns) return c.json({ success: false, message: 'Table not found' }, 404);

    const columnNames = new Set(columns.map((column) => column.name));
    const orderClause = requestedSortColumn && safeName(requestedSortColumn) && columnNames.has(requestedSortColumn)
      ? `ORDER BY ${quoteName(requestedSortColumn)} ${sortDirection}`
      : 'ORDER BY 1 DESC';

    const textColumns = columns.filter((column) => /(CHAR|CLOB|TEXT)/i.test(column.type));
    const whereClause = search && textColumns.length
      ? `WHERE ${textColumns.map((column) => `${quoteName(column.name)} LIKE ?`).join(' OR ')}`
      : '';
    const searchValues = search && textColumns.length
      ? textColumns.map(() => `%${search}%`)
      : [];

    const totalRow = await c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ${quoteName(table)} ${whereClause}`
    ).bind(...searchValues).first<{ total: number }>();
    const total = Number(totalRow?.total || 0);

    const { results: rows } = await c.env.DB.prepare(
      `SELECT * FROM ${quoteName(table)} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`
    ).bind(...searchValues, limit, offset).all();

    return c.json({
      success: true,
      rows,
      columns: columns.map((column) => column.name),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 500);
  }
});

app.post('/tables/:table/rows', async (c) => {
  const table = c.req.param('table');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);

  const body = await c.req.json().catch(() => ({})) as { data?: Record<string, unknown> };
  const data = body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
    return c.json({ success: false, message: 'data object required' }, 400);
  }

  const requestedColumns = Object.keys(data);
  if (!requestedColumns.every(safeName)) {
    return c.json({ success: false, message: 'Invalid column name' }, 400);
  }

  try {
    const tableColumns = await requireTable(c.env.DB, table);
    if (!tableColumns) return c.json({ success: false, message: 'Table not found' }, 404);
    const availableColumns = new Set(tableColumns.map((column) => column.name));
    if (!requestedColumns.every((column) => availableColumns.has(column))) {
      return c.json({ success: false, message: 'Invalid column name' }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO ${quoteName(table)} (${requestedColumns.map(quoteName).join(', ')})
       VALUES (${requestedColumns.map(() => '?').join(', ')})`
    ).bind(...requestedColumns.map((column) => bindValue(data[column]))).run();

    return c.json({ success: true, insertId: result.meta.last_row_id });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

app.put('/tables/:table/rows/:id', async (c) => {
  const table = c.req.param('table');
  const id = c.req.param('id');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);

  const body = await c.req.json().catch(() => ({})) as {
    data?: Record<string, unknown>;
    pk?: string;
  };
  const data = body.data;
  const pk = body.pk || 'id';
  if (!safeName(pk)) return c.json({ success: false, message: 'Invalid pk name' }, 400);
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
    return c.json({ success: false, message: 'data object required' }, 400);
  }

  const requestedColumns = Object.keys(data);
  if (!requestedColumns.every(safeName)) {
    return c.json({ success: false, message: 'Invalid column name' }, 400);
  }

  try {
    const tableColumns = await requireTable(c.env.DB, table);
    if (!tableColumns) return c.json({ success: false, message: 'Table not found' }, 404);
    const availableColumns = new Set(tableColumns.map((column) => column.name));
    if (!availableColumns.has(pk) || !requestedColumns.every((column) => availableColumns.has(column))) {
      return c.json({ success: false, message: 'Invalid column name' }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE ${quoteName(table)}
       SET ${requestedColumns.map((column) => `${quoteName(column)} = ?`).join(', ')}
       WHERE ${quoteName(pk)} = ?`
    ).bind(...requestedColumns.map((column) => bindValue(data[column])), bindValue(id)).run();

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

app.delete('/tables/:table/rows/:id', async (c) => {
  const table = c.req.param('table');
  const id = c.req.param('id');
  const pk = c.req.query('pk') || 'id';
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);
  if (!safeName(pk)) return c.json({ success: false, message: 'Invalid pk name' }, 400);

  try {
    const tableColumns = await requireTable(c.env.DB, table);
    if (!tableColumns) return c.json({ success: false, message: 'Table not found' }, 404);
    if (!tableColumns.some((column) => column.name === pk)) {
      return c.json({ success: false, message: 'Invalid pk name' }, 400);
    }
    await c.env.DB.prepare(
      `DELETE FROM ${quoteName(table)} WHERE ${quoteName(pk)} = ?`
    ).bind(bindValue(id)).run();
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

app.post('/tables/:table/columns', async (c) => {
  const table = c.req.param('table');
  if (!safeName(table)) return c.json({ success: false, message: 'Invalid table name' }, 400);

  const body = await c.req.json().catch(() => ({})) as {
    name?: string;
    type?: string;
    nullable?: boolean;
    default_value?: unknown;
  };
  const name = body.name;
  const type = body.type || 'VARCHAR(255)';
  const nullable = body.nullable ?? true;
  if (!name || !safeName(name)) return c.json({ success: false, message: 'Invalid column name' }, 400);

  const allowedTypes = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(500)',
    'TEXT', 'LONGTEXT',
    'INT', 'BIGINT', 'TINYINT(1)',
    'DECIMAL(10,2)', 'DECIMAL(14,2)',
    'DATE', 'DATETIME', 'TIMESTAMP',
    'BOOLEAN',
  ];
  const safeType = allowedTypes.find((allowed) => allowed.toUpperCase() === type.toUpperCase());
  if (!safeType) {
    return c.json({ success: false, message: `Type not allowed. Use: ${allowedTypes.join(', ')}` }, 400);
  }

  let defaultClause = '';
  const defaultValue = body.default_value;
  if (defaultValue !== undefined && defaultValue !== '') {
    if (typeof defaultValue === 'number' && Number.isFinite(defaultValue)) {
      defaultClause = ` DEFAULT ${defaultValue}`;
    } else if (typeof defaultValue === 'boolean') {
      defaultClause = ` DEFAULT ${defaultValue ? 1 : 0}`;
    } else if (typeof defaultValue === 'string' && /^[A-Za-z0-9_ \-.:@]{0,64}$/.test(defaultValue)) {
      defaultClause = ` DEFAULT '${defaultValue}'`;
    } else {
      return c.json({
        success: false,
        message: 'default_value must be a number, boolean, or short alphanumeric string',
      }, 400);
    }
  }

  try {
    const tableColumns = await requireTable(c.env.DB, table);
    if (!tableColumns) return c.json({ success: false, message: 'Table not found' }, 404);
    if (tableColumns.some((column) => column.name === name)) {
      return c.json({ success: false, message: 'Column already exists' }, 400);
    }

    await c.env.DB.prepare(
      `ALTER TABLE ${quoteName(table)} ADD COLUMN ${quoteName(name)} ${safeType} ${nullable ? 'NULL' : 'NOT NULL'}${defaultClause}`
    ).run();
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

app.delete('/tables/:table/columns/:column', async (c) => {
  const table = c.req.param('table');
  const column = c.req.param('column');
  if (!safeName(table) || !safeName(column)) {
    return c.json({ success: false, message: 'Invalid name' }, 400);
  }

  try {
    const tableColumns = await requireTable(c.env.DB, table);
    if (!tableColumns) return c.json({ success: false, message: 'Table not found' }, 404);
    if (!tableColumns.some((item) => item.name === column)) {
      return c.json({ success: false, message: 'Column not found' }, 404);
    }
    await c.env.DB.prepare(
      `ALTER TABLE ${quoteName(table)} DROP COLUMN ${quoteName(column)}`
    ).run();
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

app.post('/query', async (c) => {
  if (c.env.ALLOW_RAW_SQL !== 'true') {
    return c.json({ success: false, message: 'Raw SQL is disabled on this server.' }, 403);
  }

  const body = await c.req.json().catch(() => ({})) as { query?: string };
  const sql = body.query?.trim();
  if (!sql) return c.json({ success: false, message: 'Query required' }, 400);

  const employee = c.get('employee')!;
  console.warn(`[db/query] employee=${employee.id} email=${employee.email} sql=${sql.slice(0, 500)}`);
  try {
    if (/^(SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(sql)) {
      const { results } = await c.env.DB.prepare(sql).all();
      return c.json({ success: true, data: results });
    }
    const result = await c.env.DB.prepare(sql).run();
    return c.json({ success: true, data: result.meta });
  } catch (error) {
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

export default app;
