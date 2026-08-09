#!/usr/bin/env node
// MySQL → SQLite/D1 schema converter for Clockwrk.
// Reads migrations/00-mysql-source.sql (a `mysqldump --no-data`) and emits
// migrations/01-schema-d1.sql that can be run with `wrangler d1 execute`.
//
// Handles the transformations Clockwrk actually uses:
//   int AUTO_INCREMENT + PRIMARY KEY(id)   → INTEGER PRIMARY KEY AUTOINCREMENT
//   varchar(n), char(n), text, longtext    → TEXT
//   json                                    → TEXT   (query with json_extract)
//   enum('a','b')                          → TEXT CHECK(col IN ('a','b'))
//   tinyint(1)                             → INTEGER
//   int, bigint, smallint                  → INTEGER
//   decimal(m,n), float, double            → REAL
//   date, datetime, timestamp              → TEXT   (ISO strings)
//   DEFAULT CURRENT_TIMESTAMP              → same (works in SQLite)
//   DEFAULT '0' on numeric                 → DEFAULT 0
//   ENGINE=... / AUTO_INCREMENT=n / etc.   → stripped
//   UNIQUE KEY, KEY / FULLTEXT             → CREATE UNIQUE/INDEX after CREATE TABLE
//   FOREIGN KEY CASCADE                    → preserved (D1 supports FKs)
//
// Anything the script doesn't recognise is left as a `-- REVIEW:` comment
// so a human catches it instead of silently dropping the statement.

import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.argv[2] || 'migrations/00-mysql-source.sql');
const OUT = path.resolve(process.argv[3] || 'migrations/01-schema-d1.sql');

const raw = fs.readFileSync(SRC, 'utf8');

// Strip mysqldump preamble noise and version-gated comments.
const cleaned = raw
  .replace(/\/\*![\s\S]*?\*\/;?/g, '')     // /*!40101 SET ... */
  .replace(/^--.*$/gm, '')                 // -- comments
  .replace(/^\s*(LOCK|UNLOCK) TABLES.*$/gm, '')
  .replace(/^\s*SET .*$/gm, '')
  .replace(/^\s*USE .*$/gm, '');

// Split into statements. mysqldump emits DROP + CREATE per table.
const statements = cleaned.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

const out = [];
const indexes = [];

for (const stmt of statements) {
  if (/^DROP TABLE/i.test(stmt)) continue; // D1 starts empty; skip DROPs

  const m = stmt.match(/^CREATE TABLE\s+`?(\w+)`?\s*\(([\s\S]+)\)\s*(ENGINE[\s\S]*)?$/i);
  if (!m) {
    out.push(`-- REVIEW: unrecognised statement\n${stmt};`);
    continue;
  }

  const table = m[1];
  const body = m[2];

  // Parse rows inside the parens. Split on top-level commas.
  const rows = splitTopLevel(body);

  const cols = [];
  const inline = [];  // PRIMARY KEY, UNIQUE, FOREIGN KEY that stay inline
  const primaryKeyCol = { name: null };

  // First pass: detect PRIMARY KEY (col) so we can fold it into the column def
  for (const row of rows) {
    const pk = row.match(/^PRIMARY KEY\s*\(\s*`?(\w+)`?\s*\)$/i);
    if (pk) primaryKeyCol.name = pk[1];
  }

  for (const row of rows) {
    if (/^PRIMARY KEY/i.test(row)) continue; // folded into column
    if (/^UNIQUE KEY\s+`?(\w+)`?\s*\(([^)]+)\)$/i.test(row)) {
      const [, idxName, colList] = row.match(/^UNIQUE KEY\s+`?(\w+)`?\s*\(([^)]+)\)$/i);
      indexes.push(`CREATE UNIQUE INDEX IF NOT EXISTS "ux_${table}_${idxName}" ON "${table}" (${normaliseColList(colList)});`);
      continue;
    }
    if (/^KEY\s+`?(\w+)`?\s*\(([^)]+)\)$/i.test(row)) {
      const [, idxName, colList] = row.match(/^KEY\s+`?(\w+)`?\s*\(([^)]+)\)$/i);
      indexes.push(`CREATE INDEX IF NOT EXISTS "ix_${table}_${idxName}" ON "${table}" (${normaliseColList(colList)});`);
      continue;
    }
    if (/^FULLTEXT/i.test(row)) {
      out.push(`-- REVIEW: FULLTEXT index on ${table} not supported in D1: ${row}`);
      continue;
    }
    if (/^CONSTRAINT.*FOREIGN KEY/i.test(row) || /^FOREIGN KEY/i.test(row)) {
      inline.push(convertForeignKey(row));
      continue;
    }

    // Regular column
    const colMatch = row.match(/^`?(\w+)`?\s+(.+)$/);
    if (!colMatch) { out.push(`-- REVIEW: could not parse column: ${row}`); continue; }
    const [, colName, rest] = colMatch;
    cols.push(convertColumn(colName, rest, primaryKeyCol.name === colName));
  }

  const fullBody = [...cols, ...inline].map(l => '  ' + l).join(',\n');
  out.push(`CREATE TABLE IF NOT EXISTS "${table}" (\n${fullBody}\n);`);
}

if (indexes.length) {
  out.push('\n-- Indexes');
  out.push(...indexes);
}

fs.writeFileSync(OUT, out.join('\n\n') + '\n');
console.error(`Wrote ${OUT}: ${statements.length} statements → ${out.length} SQLite blocks`);

// ── helpers ────────────────────────────────────────────────────────────────

function splitTopLevel(body) {
  const rows = [];
  let depth = 0, buf = '', quote = null;
  for (const ch of body) {
    if (quote) {
      buf += ch;
      if (ch === quote && buf[buf.length - 2] !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; buf += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { rows.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) rows.push(buf.trim());
  return rows;
}

function normaliseColList(s) {
  return s.split(',').map(c => `"${c.trim().replace(/`/g, '').replace(/\(\d+\)$/, '')}"`).join(', ');
}

function convertColumn(name, rest, isPk) {
  // Type conversion
  let sqlType, isNumeric = false;
  const typeMatch = rest.match(/^(\w+)(\([^)]+\))?/i);
  const baseType = typeMatch[1].toLowerCase();
  const typeArg = typeMatch[2] || '';

  switch (baseType) {
    case 'int': case 'bigint': case 'smallint': case 'mediumint': case 'tinyint': case 'year':
      sqlType = 'INTEGER'; isNumeric = true; break;
    case 'decimal': case 'float': case 'double': case 'numeric':
      sqlType = 'REAL'; isNumeric = true; break;
    case 'varchar': case 'char': case 'text': case 'tinytext': case 'mediumtext':
    case 'longtext': case 'longblob': case 'blob': case 'json':
      sqlType = 'TEXT'; break;
    case 'date': case 'datetime': case 'timestamp': case 'time':
      sqlType = 'TEXT'; break;
    case 'enum': {
      const values = typeArg.slice(1, -1); // '(a,b,c)' → 'a,b,c'
      sqlType = `TEXT CHECK("${name}" IN (${values}))`;
      break;
    }
    default:
      return `-- REVIEW: unknown type "${baseType}" on ${name}: ${rest}`;
  }

  // Extract modifiers
  const notNull = /\bNOT NULL\b/i.test(rest);
  const defaultMatch = rest.match(/\bDEFAULT\s+('[^']*'|"[^"]*"|CURRENT_TIMESTAMP(?:\([^)]*\))?|NULL|-?\d+\.?\d*|TRUE|FALSE)/i);
  const isAutoInc = /\bAUTO_INCREMENT\b/i.test(rest);

  const parts = [`"${name}"`, sqlType];

  if (isPk && isAutoInc) {
    // Fold into column: INTEGER PRIMARY KEY AUTOINCREMENT
    parts.pop(); parts.push('INTEGER PRIMARY KEY AUTOINCREMENT');
  } else if (isPk) {
    parts.push('PRIMARY KEY');
  }

  if (notNull && !isPk) parts.push('NOT NULL');

  if (defaultMatch && !isAutoInc) {
    let val = defaultMatch[1];
    // Normalise numeric defaults stored as strings
    if (isNumeric && /^'-?\d+\.?\d*'$/.test(val)) val = val.slice(1, -1);
    if (/^CURRENT_TIMESTAMP/i.test(val)) val = 'CURRENT_TIMESTAMP';
    parts.push(`DEFAULT ${val}`);
  }

  return parts.join(' ');
}

function convertForeignKey(row) {
  const m = row.match(/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(.*)$/i);
  if (!m) return `-- REVIEW: could not parse FK: ${row}`;
  const [, cols, table, refCols, rest] = m;
  const onDelete = /ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)/i.exec(rest);
  const onUpdate = /ON UPDATE (CASCADE|SET NULL|RESTRICT|NO ACTION)/i.exec(rest);
  let out = `FOREIGN KEY (${normaliseColList(cols)}) REFERENCES "${table}" (${normaliseColList(refCols)})`;
  if (onDelete) out += ` ON DELETE ${onDelete[1]}`;
  if (onUpdate) out += ` ON UPDATE ${onUpdate[1]}`;
  return out;
}
