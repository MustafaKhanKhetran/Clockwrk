# Clockwrk API — Workers scaffold

This is the Workers + D1 rewrite target (CODEX-TASK-2). It compiles and boots
today — many route handlers are ported (auth, alerts, clients, rate,
communications, newsletter, db partial). The rest are annotated skeletons
that Codex can fill in using `src/routes/auth.ts` and `src/routes/clients.ts`
as the reference pattern.

## First-time setup

```bash
cd workers-scaffold
pnpm install          # or npm install
pnpm exec wrangler login
pnpm exec wrangler d1 create clockwrk
# copy the database_id output into wrangler.jsonc
pnpm exec wrangler r2 bucket create clockwrk-files
# secrets:
pnpm exec wrangler secret put JWT_SECRET
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put INTERNAL_ALERT_EMAIL
```

## Migrations

```bash
pnpm exec wrangler d1 migrations apply clockwrk --local     # local dev
pnpm exec wrangler d1 migrations apply clockwrk --remote    # production
```

The initial schema is `migrations/0001_initial.sql`, generated from a
`mysqldump --no-data` of the live agency_db by `convert-schema.mjs`. If the
Express schema changes, rerun the converter and add a new numbered migration
file for the diff.

## Dev + deploy

```bash
pnpm dev              # wrangler dev — local Worker + local D1 + local R2
pnpm deploy           # wrangler deploy
```

## What's ported vs skeleton

| Route file | Status |
|---|---|
| auth.ts | Full port — login, refresh, 2FA, sessions, setup-password |
| alerts.ts | Full port |
| clients.ts | Full port — CRUD + setup/reset tokens |
| communications.ts | Full port |
| newsletter.ts | Full port |
| rate.ts | Full port — USD/PKR scraper |
| db.ts | Partial — tables, schema, /query (raw SQL) |
| files.ts | Partial — /delete and /cv-upload |
| team.ts | Skeleton — GET /  only |
| projects.ts | Skeleton — GET / only |
| requests.ts | Skeleton — GET / only |
| finance.ts | Skeleton — GET /payments only |
| bookings.ts | Skeleton — GET / only |
| calendar.ts | Skeleton |
| hr.ts | Skeleton — POST /apply/job partial |
| timeLogs.ts | Skeleton — GET / only |
| referrals.ts | Skeleton — GET / only |
| predictions.ts | Skeleton — GET / only |
| stats.ts | Skeleton — GET / only |
| site.ts | Skeleton — GET /jobs only, form POSTs return 501 |
| clientPortal.ts | Skeleton — GET /me only |

## Services (also to port)

| File | Status |
|---|---|
| src/services/bookingAutoAssign.ts | Skeleton — count only |
| src/services/requestWorkflow.ts | NOT YET WRITTEN — port from Express services/requestWorkflow.js |
| src/services/billingChanges.ts | NOT YET WRITTEN — port from Express services/billingChanges.js |
| src/services/publicSiteEmails.ts | NOT YET WRITTEN — port from Express services/publicSiteEmails.js |

## Cron triggers

Two crons declared in `wrangler.jsonc`:

- `* * * * *` — booking auto-assign sweep
- `0 3 * * *` — nightly D1 → R2 backup (dumps every row of every user table)

## Cross-cutting security preserved from the audit

- Employee tokens rejected on client routes and vice versa (middleware/auth.ts)
- SVG excluded from upload mime allowlist (lib/uploads.ts)
- /api/files DELETE gated to owner/admin
- Raw /api/db/query gated by ALLOW_RAW_SQL var + audit-logged
- Generic 5xx responses (no err.message leak) via app.onError
- Secure headers via hono/secure-headers
- ipRateLimit on public form endpoints (10/hour/IP)
- JWT refresh tokens rotate on use; access tokens are 15 min
- 2FA (TOTP + 10 backup codes)

## Known port gaps (things that need care)

1. **`queue_position` in requests** used `SELECT ... FOR UPDATE`. Rewrite as
   D1 `batch()` — read max + insert in one atomic call.
2. **`information_schema` queries** in Settings → use `sqlite_master` +
   `PRAGMA table_info`.
3. **JSON columns** are `TEXT` in SQLite. Use `parseJson(row.col, [])` from
   `lib/db.ts` when reading; `JSON.stringify(value)` when writing.
4. **Date arithmetic**: `DATE_SUB(CURDATE(), INTERVAL 30 DAY)` → `datetime('now','-30 days')`.
5. **UUID()**: MySQL's UUID() → `crypto.randomUUID()` bound as a param.
6. **`NOW()`** → `CURRENT_TIMESTAMP` or `datetime('now')`.
7. **`ON DUPLICATE KEY UPDATE`** → `ON CONFLICT DO UPDATE`.

## Deployment cutover checklist

1. `wrangler deploy` → API live at `<worker>.workers.dev`
2. Add custom domain `api.clockwrk.io` in the Cloudflare dashboard
3. Point DNS
4. Update dashboard + portal env vars (`VITE_API_URL=https://api.clockwrk.io`)
5. Verify: login works, refresh works, 2FA challenge works, file upload works
6. Stop the Express container: `docker rm -f clockwrk-api`
