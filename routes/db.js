import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

// All DB routes are owner-only
router.use(authenticate, requireOwner);

// ─── Helpers ────────────────────────────────────────────────────────────────

const DB_NAME = process.env.DB_NAME || 'agency_db';

// Whitelist: only allow alphanumeric + underscores for table/column names
const safeName = name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

// ─── List all tables ─────────────────────────────────────────────────────────
// GET /api/db/tables
router.get('/tables', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT TABLE_NAME AS name,
              TABLE_ROWS AS approx_rows,
              CREATE_TIME AS created_at,
              UPDATE_TIME AS updated_at
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME ASC`,
      [DB_NAME]
    );
    return res.json({ success: true, tables: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get table schema ─────────────────────────────────────────────────────────
// GET /api/db/tables/:table/schema
router.get('/tables/:table/schema', async (req, res) => {
  const { table } = req.params;
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });

  try {
    const [columns] = await db.execute(
      `SELECT COLUMN_NAME AS name,
              COLUMN_TYPE AS type,
              IS_NULLABLE AS nullable,
              COLUMN_DEFAULT AS default_value,
              COLUMN_KEY AS key_type,
              EXTRA AS extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION ASC`,
      [DB_NAME, table]
    );

    if (!columns.length) return res.status(404).json({ success: false, message: 'Table not found' });

    const [indexes] = await db.execute(
      `SELECT INDEX_NAME AS index_name, COLUMN_NAME AS column_name, NON_UNIQUE AS non_unique
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [DB_NAME, table]
    );

    return res.json({ success: true, columns, indexes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get table rows (paginated) ───────────────────────────────────────────────
// GET /api/db/tables/:table/rows?page=1&limit=50&search=&sort_col=id&sort_dir=desc
router.get('/tables/:table/rows', async (req, res) => {
  const { table } = req.params;
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });

  const page     = Math.max(1, parseInt(req.query.page)  || 1);
  const limit    = Math.min(200, parseInt(req.query.limit) || 50);
  const offset   = (page - 1) * limit;
  const sortCol  = req.query.sort_col;
  const sortDir  = req.query.sort_dir === 'asc' ? 'ASC' : 'DESC';
  const search   = req.query.search || '';

  try {
    // Validate sort column exists
    let orderClause = 'ORDER BY 1 DESC';
    if (sortCol && safeName(sortCol)) {
      orderClause = `ORDER BY \`${sortCol}\` ${sortDir}`;
    }

    // Get columns first so we know what to search
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [DB_NAME, table]
    );

    if (!cols.length) return res.status(404).json({ success: false, message: 'Table not found' });

    // Build search WHERE clause across all varchar/text columns
    let whereClause = '';
    const searchParams = [];
    if (search) {
      const [textCols] = await db.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND DATA_TYPE IN ('varchar','text','char','tinytext','mediumtext','longtext')`,
        [DB_NAME, table]
      );
      if (textCols.length) {
        const conditions = textCols.map(c => `\`${c.COLUMN_NAME}\` LIKE ?`).join(' OR ');
        whereClause = `WHERE ${conditions}`;
        textCols.forEach(() => searchParams.push(`%${search}%`));
      }
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM \`${table}\` ${whereClause}`,
      searchParams
    );

    const [rows] = await db.execute(
      `SELECT * FROM \`${table}\` ${whereClause} ${orderClause} LIMIT ${limit} OFFSET ${offset}`,
      searchParams
    );

    return res.json({
      success: true,
      rows,
      columns: cols.map(c => c.COLUMN_NAME),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Insert row ───────────────────────────────────────────────────────────────
// POST /api/db/tables/:table/rows   body: { data: { col: val, ... } }
router.post('/tables/:table/rows', async (req, res) => {
  const { table } = req.params;
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });

  const { data } = req.body;
  if (!data || typeof data !== 'object' || !Object.keys(data).length) {
    return res.status(400).json({ success: false, message: 'data object required' });
  }

  // Validate column names
  const cols = Object.keys(data);
  if (!cols.every(safeName)) return res.status(400).json({ success: false, message: 'Invalid column name' });

  const colList = cols.map(c => `\`${c}\``).join(', ');
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map(c => data[c] === '' ? null : data[c]);

  try {
    const [result] = await db.execute(
      `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`,
      values
    );
    return res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Update row ───────────────────────────────────────────────────────────────
// PUT /api/db/tables/:table/rows/:id   body: { data: { col: val, ... }, pk: 'id' }
router.put('/tables/:table/rows/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });

  const { data, pk = 'id' } = req.body;
  if (!safeName(pk)) return res.status(400).json({ success: false, message: 'Invalid pk name' });
  if (!data || typeof data !== 'object' || !Object.keys(data).length) {
    return res.status(400).json({ success: false, message: 'data object required' });
  }

  const cols = Object.keys(data);
  if (!cols.every(safeName)) return res.status(400).json({ success: false, message: 'Invalid column name' });

  const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
  const values = [...cols.map(c => data[c] === '' ? null : data[c]), id];

  try {
    await db.execute(
      `UPDATE \`${table}\` SET ${setClause} WHERE \`${pk}\` = ?`,
      values
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Delete row ───────────────────────────────────────────────────────────────
// DELETE /api/db/tables/:table/rows/:id?pk=id
router.delete('/tables/:table/rows/:id', async (req, res) => {
  const { table, id } = req.params;
  const pk = req.query.pk || 'id';
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });
  if (!safeName(pk))    return res.status(400).json({ success: false, message: 'Invalid pk name' });

  try {
    await db.execute(`DELETE FROM \`${table}\` WHERE \`${pk}\` = ?`, [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Add column ───────────────────────────────────────────────────────────────
// POST /api/db/tables/:table/columns   body: { name, type, nullable, default_value }
router.post('/tables/:table/columns', async (req, res) => {
  const { table } = req.params;
  if (!safeName(table)) return res.status(400).json({ success: false, message: 'Invalid table name' });

  const { name, type = 'VARCHAR(255)', nullable = true, default_value } = req.body;
  if (!name || !safeName(name)) return res.status(400).json({ success: false, message: 'Invalid column name' });

  // Only allow safe SQL types
  const ALLOWED_TYPES = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(500)',
    'TEXT', 'LONGTEXT',
    'INT', 'BIGINT', 'TINYINT(1)',
    'DECIMAL(10,2)', 'DECIMAL(14,2)',
    'DATE', 'DATETIME', 'TIMESTAMP',
    'BOOLEAN',
  ];
  const safeType = ALLOWED_TYPES.find(t => t.toUpperCase() === type.toUpperCase());
  if (!safeType) return res.status(400).json({ success: false, message: `Type not allowed. Use: ${ALLOWED_TYPES.join(', ')}` });

  const nullClause     = nullable ? 'NULL' : 'NOT NULL';
  const defaultClause  = default_value !== undefined && default_value !== ''
    ? `DEFAULT '${String(default_value).replace(/'/g, "\\'")}'`
    : '';

  try {
    await db.execute(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${safeType} ${nullClause} ${defaultClause}`.trim()
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Drop column ──────────────────────────────────────────────────────────────
// DELETE /api/db/tables/:table/columns/:column
router.delete('/tables/:table/columns/:column', async (req, res) => {
  const { table, column } = req.params;
  if (!safeName(table) || !safeName(column)) {
    return res.status(400).json({ success: false, message: 'Invalid name' });
  }

  try {
    await db.execute(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Raw SQL query (replaces /api/query) ─────────────────────────────────────
// POST /api/db/query   body: { query: "SELECT ..." }
router.post('/query', async (req, res) => {
  const { query: sql } = req.body;
  if (!sql) return res.status(400).json({ success: false, message: 'Query required' });
  try {
    const [rows] = await db.execute(sql);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
