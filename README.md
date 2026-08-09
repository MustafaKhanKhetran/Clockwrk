# Clockwrk Monorepo

Clockwrk's public site, internal dashboard, client portal, API, and shared runtime packages live in this pnpm + Turborepo workspace.

## Applications

| App | Purpose | Local URL |
| --- | --- | --- |
| `apps/api` | Express API, MySQL migrations, and the in-progress Cloudflare Worker/D1 port | `http://localhost:3001` |
| `apps/dashboard` | Internal operations dashboard for Clockwrk employees | `http://localhost:5173` |
| `apps/portal` | Client portal for projects, requests, billing, messages, and support | `http://localhost:5174` |
| `apps/site` | Public multi-page marketing, careers, booking, referral, and checkout site | `http://localhost:5175` |

## Shared packages

- `@clockwrk/shared-types`: Zod schemas and shared plan configuration.
- `@clockwrk/auth`: Configurable browser auth/session client used by the dashboard and portal.
- `@clockwrk/db-schema`: Drizzle schema entry point and D1 migration artifacts produced by the API migration work.

## Setup

```bash
corepack enable
pnpm install
# Create app-local .env files from the documented root template.
cp .env.example apps/api/.env
cp .env.example apps/dashboard/.env
cp .env.example apps/portal/.env
pnpm dev
```

Each app reads only the variables it needs. Replace placeholders in each app's `.env`; never commit real credentials.

## Commands

```bash
pnpm dev       # start all four applications in parallel
pnpm build     # build every application and shared package that has a build task
pnpm lint      # run each package's lint task
pnpm --filter @clockwrk/api dev
pnpm --filter @clockwrk/dashboard dev
pnpm --filter @clockwrk/portal dev
pnpm --filter @clockwrk/site dev
```

The API, dashboard, portal, and marketing-site histories were imported without squashing. The original commits remain in the combined graph. These commands open each imported app's original history directly:

```bash
git log 46b2960^2  # API
git log 8e7c7d1^2  # dashboard
git log 511a034^2  # portal
git log 46b2960^1  # marketing site history before consolidation
```
