# Clockwrk Dashboard Review Map

This archive is a source snapshot of the current Clockwrk internal dashboard and the shared API it runs against. Application code was not refactored, cleaned up, or fixed while preparing the archive.

## Archive layout

- `frontend/` - current React/Vite internal dashboard.
- `backend/` - shared Express API entry point, route modules, middleware/services, migrations, and a schema-only database export.

## Frontend

- Entry point: `frontend/src/main.jsx`
- Route tree: `frontend/src/App.jsx`
- Authentication context: `frontend/src/context/AuthContext.jsx`
- Theme context: `frontend/src/context/ThemeContext.jsx`
- Session/token helpers: `frontend/src/utils/auth.js`
- API wrapper: `frontend/src/utils/dashboardApi.js`
- Role/access configuration: `frontend/src/config/roles.js`
- Shared shell/navigation: `frontend/src/components/DashLayout.jsx`, `frontend/src/components/Sidebar.jsx`, and related CSS
- Shared UI components: `frontend/src/components/`
- Complete current page directory: `frontend/src/pages/`
- Global styling: `frontend/src/index.css`
- Runtime assets: `frontend/public/`

### Routed pages

The current `App.jsx` directly routes Login, Overview, Clients, Projects, Requests, My Work, Time, Team, Finance, Bookings, Calendar, Alerts, Files, and the shared Coming Soon screen. Access is protected through `ProtectedRoute`, `RoleGuard`, and `PAGE_ACCESS`.

### Present but currently unrouted page modules

The complete current `src/` is included for accurate dead-code and work-in-progress review. These page files exist but are not imported as concrete screens by the current route tree: `AuditLogs.jsx`, `Database.jsx`, `Jobs.jsx`, `Knowledge.jsx`, `Newsletter.jsx`, `Pipeline.jsx`, `Referrals.jsx`, `Reports.jsx`, `Settings.jsx`, `WebsiteHealth.jsx`, `WorkflowHealth.jsx`, and `Workload.jsx`. Several corresponding URLs currently render `ComingSoon.jsx`.

## Backend

- Server entry point: `backend/server.js`
- Database connection pool/config: `backend/db.js`
- Internal authentication middleware: `backend/middleware/auth.js`
- API route modules: `backend/routes/`
- Shared subscription/billing logic: `backend/services/billingChanges.js`
- Booking assignment service started by the server: `backend/services/bookingAutoAssign.js`
- SQL migrations: `backend/migrations/`
- Schema-only database export: `backend/database/schema.sql`

The API is shared by the internal dashboard and client portal. Every local module imported by `server.js` is included so reviewers can trace the complete server startup and cross-product data flow.

### Main dashboard API mounts

`server.js` mounts authentication, stats, clients, projects, requests, finance, team, bookings, alerts, calendar, referrals, newsletter, HR, time logs, files, communications, database, n8n, rate, predictions, and client-portal routes under `/api/*`.

## Database scope

`backend/database/schema.sql` contains table definitions, indexes, keys, and relationships only. It contains no database records. The shared schema covers clients, employees, teams, assignments, projects, requests/comments, files, payments/expenses, bookings/attendees, communications, alerts, referrals, applications, time logs, subscription changes, audit data, and related operational tables.

## Client portal

The separate client portal checkout is located at `/Users/mustafakhetran/clockwrk-portal` on the source machine. Its frontend is intentionally excluded because it is a separate application. The shared backend client route, `backend/routes/clientPortal.js`, remains included because portal actions create alerts and records consumed by this dashboard.

## Local run commands

Prerequisites: Node.js, npm, and MySQL.

Backend:

```bash
cd backend
npm install
cp .env.example .env
# Create/import the database described by database/schema.sql, then fill in local credentials.
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Production build:

```bash
cd frontend
npm run build
npm run preview
```

The sanitized frontend example points to `http://localhost:3001`.

## Intentional exclusions

- `node_modules/`, `dist/`, build caches, temporary files, logs, and runtime uploads: generated or operational content.
- Real `.env` and `.env.local` files: excluded to protect credentials and machine-specific configuration; sanitized examples are included.
- `.claude/`, `.vscode/`, and `.prompts/`: local tooling and historical implementation prompts, not runtime dependencies.
- `HANDOFF-CONTEXT.md`: excluded because it contains live login and database credentials.
- `db.txt`: excluded because it is an uncontrolled database artifact; a fresh schema-only export is included instead.
- Demo invoices, tax documents, `1-JAN-2026/`, and loose PDFs/HTML: excluded as private business/sample documents rather than application source.
- `DESIGN-SYSTEM.md` and `EDITABLE_ELEMENTS.md`: excluded because they are prescriptive/historical notes and do not consistently describe the current routed implementation.
- The separate client portal and marketing-site frontends: separate applications not imported by this dashboard.
- Database records: intentionally omitted; only schema metadata is included.
- `.git/`: no Git repository exists in the dashboard folder.
