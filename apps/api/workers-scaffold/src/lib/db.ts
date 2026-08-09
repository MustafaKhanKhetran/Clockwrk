// D1 helpers. Kept thin — most route code calls env.DB directly. These are
// the patterns that got repetitive enough to extract.

// D1 exposes `.first<T>()`, `.all<T>()`, `.run()`, `.batch([...])`. We
// deliberately do NOT wrap into a query builder — the raw prepared-statement
// API is small, safe, and easier to read than a DSL.

// Parse a JSON column, tolerating both string (mysql legacy) and object
// (D1 native). Falls back to `fallback` on any error.
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// SQLite stores our timestamps as ISO strings (per CURRENT_TIMESTAMP or
// datetime('now')). This is a shim so route handlers can keep saying `new Date()`
// where they need to compare.
export function nowIso() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

// Add N days to now, returned in SQLite datetime format.
export function futureIso(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function futureIsoMinutes(minutes: number) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
