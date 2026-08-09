# Codex Task 3 — Monorepo consolidation

**Goal**: Merge `clockwrk-api`, `clockwrk-dashboard`, `clockwrk-portal`, and the marketing site into a single pnpm + Turborepo monorepo at `~/clockwrk/`. Can run in parallel with Task 2 (the two don't overlap).

## Target layout
```
clockwrk/
├── apps/
│   ├── api/          (from clockwrk-api)
│   ├── dashboard/    (from clockwrk-dashboard)
│   ├── portal/       (from clockwrk-portal)
│   └── site/         (from wherever the marketing site currently lives)
├── packages/
│   ├── shared-types/    # Zod schemas: User, Client, Request, Plan, Alert, etc.
│   ├── auth/            # login, refreshSession, submit2faChallenge — used by dashboard + portal
│   └── db-schema/       # Drizzle schema + D1 migrations (Task 2 produces these)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json         # workspace root
├── .gitignore
└── README.md
```

## Steps

1. **Preserve git history** for each app. Use `git subtree add` or `git-filter-repo` — each app should keep its commit log so we don't lose the security work already committed.

2. **Extract shared types**. Both frontends have duplicate definitions (`Plan`, `Client`, `Request`, `Alert`). Move to `packages/shared-types` using Zod schemas so runtime validation is possible. Update imports in dashboard and portal.

3. **Extract shared auth**. `clockwrk-dashboard/src/utils/auth.js` and `clockwrk-portal/src/v3/api.js` both do login + refresh + logout. Merge into `packages/auth`. Dashboard uses `{ tokenKey: 'cw_dash_token', apiBase: ... }`, portal uses `{ tokenKey: 'clockwrk_portal_token', apiBase: ... }`.

4. **One `.env.example`** at the repo root that documents every env var used by any app. Each app still has its own `.env`.

5. **Turborepo pipeline**:
   ```json
   {
     "pipeline": {
       "build": { "dependsOn": ["^build"] },
       "dev": { "cache": false, "persistent": true },
       "lint": {}
     }
   }
   ```

6. **One `README.md`** at the root that says what each app is and how to run everything: `pnpm dev` starts all four in parallel.

## Non-goals
- Don't rewrite anything's runtime behaviour
- Don't consolidate CSS or component libraries (that's a later fight)
- Don't touch the security-critical files unless the import paths need updating

## Definition of done
- `pnpm install` at the root installs everything
- `pnpm dev` starts all four apps
- Dashboard and portal both import `Plan`, `Client`, etc. from `@clockwrk/shared-types`
- Committed with subtrees so `git log` for each app still shows its history
