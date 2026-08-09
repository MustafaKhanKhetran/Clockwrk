# Clockwrk Consolidation & Migration Plan

**Goal**: Get Clockwrk off the founder's laptop, into one coherent place, with no ops burden. Empty DB + no live customers = the cheapest possible migration window.

**End state**: One monorepo. Everything on Cloudflare (Workers + D1 + R2 + Pages). $5/mo. Zero servers.

---

## Where things are today

**Repos (4, separate):**
- `clockwrk-api` — Express + MySQL, Dockerized (this repo)
- `clockwrk-dashboard` — React internal dashboard
- `clockwrk-portal` — React client portal
- `clockwrk-site` — marketing site (planned Hostinger upload — kill that plan)

**Runtime (all on founder's Mac):**
- `clockwrk-api` container
- `mysql` container
- `n8n` container with 24 workflows (17 dead legacy, 7 active)

**Data:**
- MySQL (empty — wiped recently, owner login + bank details preserved)
- R2 (files) — Cloudflare, already good
- localStorage tokens (dashboard + portal)

**Third parties:**
- Cloudflare R2 (files)
- Resend (email) — currently called from n8n
- Cloudflare DNS

---

## End state

```
      CLOUDFLARE ONLY (~$5/mo)
    ┌─────────────────────────────────────────┐
    │  ⚡ Workers (API — Hono on Node compat) │
    │  💾 D1 (SQLite)                         │
    │  📁 R2 (files)                          │
    │  🌐 Pages × 3 (dashboard, portal, site) │
    │  🛡️ WAF + DNS + Bot protection         │
    │  ✉️  Email Routing (or Resend)          │
    └─────────────────────────────────────────┘
```

**Monorepo layout:**
```
clockwrk/
├── apps/
│   ├── api/          Hono Worker
│   ├── dashboard/    React → Cloudflare Pages
│   ├── portal/       React → Cloudflare Pages
│   └── site/         Marketing → Cloudflare Pages
├── packages/
│   ├── shared-types/ Zod schemas, DB types, DTOs
│   ├── auth/         JWT / TOTP / refresh helpers shared by all frontends
│   └── db-schema/    Drizzle schema + migrations (D1)
├── infra/
│   ├── wrangler.toml
│   └── deploy/       Docs + scripts
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Sequence of work

Split into three tracks. **Track A** is the founder / stateful-context work (small, judgment-heavy). **Tracks B and C** are codebase rewrites — hand these to Codex with the spec files linked below.

### Track A — Cleanup (founder, ~1 hr)
1. Delete 17 dead n8n workflows — see `MIGRATION.md#delete-command` below
2. After tracks B and C land: stop + remove the n8n container
3. Cloudflare account setup: enable Workers Paid ($5/mo), create D1 database, create Pages projects, install `wrangler` locally
4. Point DNS: `api.clockwrk.io`, `my.clockwrk.io`, `dashboard.clockwrk.io`, `clockwrk.io` → Cloudflare

### Track B — Fold n8n into the current Express API (Codex)
See `CODEX-TASK-1.md`. This is a bridge step: get n8n's 7 active workflows out of n8n and into the existing Express API. Kills one whole service, preserves everything else. **Do this even if you decide to postpone the D1 migration** — n8n needs to die either way.

### Track C — Rewrite API on Workers + D1 (Codex)
See `CODEX-TASK-2.md`. Full port: Express → Hono, mysql2 → D1, multer → Workers native multipart. This is the big one (~1-2 weeks). Only start once Track B is merged.

### Track D — Monorepo consolidation (Codex, can run in parallel with C)
See `CODEX-TASK-3.md`. Move all four repos into one, extract shared types, wire up Turborepo. Does not touch runtime behavior.

### Track E — Deployment (founder, after C+D)
- `wrangler deploy` for API
- `wrangler pages deploy` for each frontend
- DNS cutover
- Nightly D1 export to R2 as backup

---

## Delete command (Track A step 1)

The 17 dead workflow IDs are in `/tmp/dead-workflows.txt` on this machine. Run:

```bash
N8N_KEY=$(grep '^N8N_API_KEY=' /tmp/clockwrk-api.env | cut -d= -f2-)
while read id name; do
  curl -s -o /dev/null -w "%{http_code}  $id  $name\n" \
    -X DELETE -H "X-N8N-API-KEY: $N8N_KEY" \
    "http://localhost:5678/api/v1/workflows/$id"
done < /tmp/dead-workflows.txt
```

---

## Migration timing rationale

**Migrating now (empty DB, no customers) is 4-6× cheaper than migrating later:**

| Concern | Now | Later |
|---|---|---|
| Data migration | Nothing to migrate | Export + transform + import, downtime |
| Customer downtime | None | Maintenance window + comms |
| Feature freeze | Product is complete | You'll be mid-feature |
| Schema surface | 8 migrations | 20+ migrations by then |
| Integrations | None live | Webhooks, emailed links, cached URLs |
| Risk tolerance | Fail freely | Every bug = angry paying user |

This is the cheapest window this project will ever have.

---

## Known blockers / decisions still open

- **Bcrypt in Workers is slow (~200ms).** Options: keep bcrypt (acceptable at low volume), or switch to Web Crypto scrypt. Recommend: keep bcrypt for now; profile later.
- **`FOR UPDATE` row locking**: SQLite/D1 has no equivalent. The `queue_position` logic in `services/requestWorkflow.js` must move to D1 `batch()` transactions with explicit ordering.
- **`information_schema` queries** (used by dashboard Settings page for the DB browser): rewrite against SQLite `sqlite_master` + `PRAGMA table_info`.
- **JSON columns**: MySQL has native `JSON`, SQLite stores as `TEXT` + `json_*()` functions. Same expressiveness, different syntax.
- **n8n's Resend calls**: fold into the API using Resend's SDK; store `RESEND_API_KEY` in Wrangler secrets.
