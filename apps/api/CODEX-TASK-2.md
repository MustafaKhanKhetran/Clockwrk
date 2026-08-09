# Codex Task 2 — Migrate API to Cloudflare Workers + D1

**Repo**: `clockwrk-api` → will become `apps/api` in the monorepo
**Branch**: `codex/workers-migration`
**Depends on**: Task 1 merged first (folded n8n into Express — that same route set gets ported here)

**Goal**: Full rewrite of the Express + MySQL API onto Cloudflare Workers (Hono) + D1 (SQLite). Empty DB, no live customers — this is a clean-slate migration.

## Target stack
- **Runtime**: Cloudflare Workers with `nodejs_compat` flag
- **Router**: Hono (mounts identically to Express)
- **DB**: D1 via `env.DB.prepare(...).bind(...).all()`
- **ORM (optional)**: Drizzle ORM has a first-class D1 driver — recommend using it, saves rewriting `db.execute` calls
- **Storage**: R2 via `env.R2.put(...)` (drop `@aws-sdk/client-s3`, use native binding)
- **Email**: Resend SDK (works in Workers)
- **Auth**: `jose` for JWT (works in Workers, `jsonwebtoken` does not)
- **Passwords**: `bcryptjs` works but is slow (~200ms). Keep it for now, add TODO to move to Web Crypto scrypt
- **TOTP**: `otpauth` works unchanged
- **Multipart uploads**: Use `request.formData()` — native, no `multer`

## SQL dialect conversion
The 8 migrations in `migrations/` are MySQL. Translate to SQLite in a new `apps/api/migrations/` directory:

| MySQL | SQLite / D1 |
|---|---|
| `INT AUTO_INCREMENT PRIMARY KEY` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `VARCHAR(n)` | `TEXT` |
| `JSON` | `TEXT` (use `json_extract`, `json_set`) |
| `ENUM('a','b')` | `TEXT CHECK(col IN ('a','b'))` |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| `NOW()` | `datetime('now')` |
| `DATE_ADD(NOW(), INTERVAL 30 DAY)` | `datetime('now', '+30 days')` |
| `TIMESTAMPDIFF(...)` | `julianday(a) - julianday(b)` |
| `INSERT ... ON DUPLICATE KEY UPDATE` | `INSERT ... ON CONFLICT(col) DO UPDATE` |
| `FOR UPDATE` (row lock) | **Rewrite** using D1 `batch()` transactions — see queue-position note |
| `LAST_INSERT_ID()` | `last_insert_rowid()` (or use D1's returned meta) |
| `INFORMATION_SCHEMA.TABLES` | `sqlite_master WHERE type='table'` |
| `INFORMATION_SCHEMA.COLUMNS` | `PRAGMA table_info(table_name)` |

## Special cases

**`services/requestWorkflow.js` — queue-position logic uses `SELECT ... FOR UPDATE`.**
D1 has no row locking. Rewrite as a `batch([...])` transaction that reads max(queue_position) and inserts atomically. If concurrency is a real concern, wrap the whole client's queue in a Durable Object (one per client) — but at Clockwrk's scale, batch is enough.

**`routes/db.js` — the Settings page's SQL browser.**
Uses `INFORMATION_SCHEMA`. Rewrite against `sqlite_master` + `PRAGMA table_info`. The raw `/query` endpoint should still work but be gated behind `env.ALLOW_RAW_SQL === 'true'`.

**`routes/files.js` — R2 delete + list.**
Replace `@aws-sdk/client-s3` with `env.R2.delete(key)` and `env.R2.list({ prefix })`. Native binding is faster and doesn't need credentials in env.

**`services/bookingAutoAssign.js` — 60-second poller.**
Move to a Cron Trigger in `wrangler.toml`:
```toml
[triggers]
crons = ["* * * * *"]
```
Move the polling function into `src/cron.js` and dispatch from the `scheduled()` handler.

**In-memory caches** (like `lastSeenCache` in `middleware/auth.js`):
Move to Cloudflare KV, or drop them entirely — access tokens are 15 min anyway.

## wrangler.toml template
```toml
name = "clockwrk-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "clockwrk"
database_id = "<fill after wrangler d1 create clockwrk>"

[[r2_buckets]]
binding = "R2"
bucket_name = "clockwrk-files"

[vars]
ALLOWED_ORIGINS = "https://dashboard.clockwrk.io,https://my.clockwrk.io"
TRUST_PROXY_HOPS = "1"
ALLOW_RAW_SQL = "false"

[triggers]
crons = ["* * * * *"]

# Secrets set via `wrangler secret put`:
#   JWT_SECRET, RESEND_API_KEY, RESEND_FROM
```

## Route map — mount all under `app.route(...)`
Same URL structure as today (`/api/auth`, `/api/clients`, `/api/projects`, etc.) so the dashboard and portal need zero URL changes.

## Definition of done
- `wrangler dev` runs the API locally against a local D1 (`wrangler d1 execute --local`)
- All existing routes respond identically to their Express counterparts (same status codes, same JSON shape)
- Migrations run cleanly against a fresh D1
- No `dotenv`, no `mysql2`, no `express`, no `multer` imports remain
- The founder can `wrangler deploy` and it comes up on `api.clockwrk.io`

## What to preserve as-is
- **Security work already done**: helmet-equivalent headers, refresh-token rotation, 2FA challenge flow, credential rate limiter, prod error masking. All of it ports; don't drop any of it.
- **Route auth** (`clientAuth` rejects non-client tokens; `authenticate` rejects client tokens). Keep the split.
