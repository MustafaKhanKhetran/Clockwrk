# Codex prompt — Projects page redesign

## READ FIRST
1. `/Users/mustafakhetran/clockwrk-dashboard/DESIGN-SYSTEM.md` — the single source of truth for tokens, layout, components.
2. `/Users/mustafakhetran/clockwrk-dashboard/src/pages/Clients.jsx` and `Clients.css` — the reference implementation of the design system.
3. `/Users/mustafakhetran/clockwrk-dashboard/src/pages/Overview.jsx` — for `KpiStrip`, `nameColor`, and the side-card patterns.

## SCOPE
Edit ONLY:
- `/Users/mustafakhetran/clockwrk-dashboard/src/pages/Projects.jsx` (full rewrite, mirror Clients.jsx structure)
- `/Users/mustafakhetran/clockwrk-dashboard/src/pages/Projects.css` (create new, replace whatever exists)

Do NOT touch any other page, the API, the sidebar, or the topbar.

## DATA SHAPE
`GET /api/projects` (already wired in `utils/dashboardApi.js`) returns rows:
```js
{
  id, name, client_id, client_name, client_company, client_plan,
  status: 'planning'|'active'|'in_progress'|'in_review'|'completed'|'paused'|'archived',
  priority: 'low'|'normal'|'high'|'urgent',
  health_status: 'healthy'|'warning'|'critical',
  progress_percent: 0-100,
  start_date, due_date,
  estimated_hours, github_repo, staging_url, live_url, tech_stack, notes,
  project_manager_id,
  active_requests: number,
  total_logs: number
}
```
Compute derived fields in-component (do not request new ones):
- `daysToDeadline = due_date ? floor((due_date - today) / 86400000) : null`
- `isOverdue = daysToDeadline < 0 && status not in ['completed','archived']`
- `velocity = total_logs > 0 ? estimated_hours / total_logs : null`  (placeholder for now)

## PAGE LAYOUT

### Header
- Greeting: `Projects · {count}` with `count` bolded.
- Subline: "Active builds across the agency."
- Actions: date pill + `+ New Project` button (only if `canWrite(user, 'projects')`).

### KPI strip (4 cards)
1. **Active Projects** (tone: indigo, icon: FolderOpen) — count of `status in ['active','in_progress','in_review']`.
2. **Average Progress** (tone: green, icon: ArrowUpRight) — `Math.round(avg(progress_percent))` rendered as `X%`.
3. **At Risk** (tone: red, icon: Bell) — count where `health_status === 'critical' || isOverdue || priority === 'urgent'`.
4. **Due This Month** (tone: blue, icon: CalendarDays) — count where `due_date` falls inside the current month.

### Two-column grid

#### LEFT (main)
- Filter bar: search (matches name / client_name / tech_stack), status PillSelect, priority PillSelect, view-toggle (Cards/List). Default view: Cards.
- `.tw-card .pj-list-card`:
  - **Cards mosaic**: each tile shows
    - Top row: avatar (initials of `name` with `nameColor()` bg) + status pill (right) on top, health dot (top-right corner of avatar — green/amber/red 9px disc with 2px white ring).
    - Name (15px, weight 600, ellipsis), client_name + client_company subline.
    - Mid row: two stat squares — Active Requests / Logged Hours.
    - Progress bar (4px tall, rounded, fill width = progress_percent). Color: green if >=70, amber if 40–69, red if <40.
    - Footer: Banknote-replaced icon (use `Clock3`) + days-to-deadline (`Due in N days` or `Overdue · N days` in red) on the left; priority pill on the right.
  - **List view**: columns `[avatar 40px] [Name + client 1.4fr] [Status 100px] [Priority 90px] [Progress 130px] [Health 70px] [Due 110px] [Requests 70px]`. Progress = inline bar. Health = dot. Click row → drawer.

#### RIGHT (side column)
Render exactly these four side cards in order:
1. **Top performer** — POSITIVE HERO (`#8ee61f` background). Pick project with highest `progress_percent`. Show name, client, big number `{progress}%`, caption `"On track · finishes {fmtDate(due_date)}"`. Action link "View project →" opens drawer.
2. **At Risk** — DANGER HERO (`#080b0f` background). Kicker `AT RISK` in `#ff6b5f`. Title `{count} need attention`. List up to 4 rows with project name + reason (`Overdue · N days` / `Critical health` / `Urgent priority`).
3. **Health Mix** — three horizontal bars: healthy / warning / critical with counts and bar fills (`--green`, `#f5da0b`, `--red`).
4. **Recent activity** — list up to 4 most recently updated projects (sort by `updated_at` if present, else by `start_date` desc). Each row: avatar + name + relative time.

### Drawer
Tabs in order: **Overview · Activity · Requests · Files · Links**.
- Hero tints by `health_status`: healthy → `tint-green`, warning → `tint-blue`, critical → grey/red.
- **Overview**: 2-col `.pj-detail-grid` with PROJECT NAME, CLIENT, START, DUE, PRIORITY, STATUS, EST HOURS, TECH STACK. Plus a full-width brief/notes block.
- **Activity**: full-width progress bar + "{N} requests · {N} logs" + recent time logs (latest 5 from a placeholder array — leave a TODO if `/api/time-logs?project_id=X` isn't called here).
- **Requests**: link to `/requests?project_id={id}` + count.
- **Files**: existing `<FileList entityType="project" entityId={id} canManage={canWrite}/>`.
- **Links**: GitHub repo, staging URL, live URL — each as a clickable button-pill with `ExternalLink` icon.

### Modal (Add Project)
Reuse existing fields from current Projects.jsx's `EMPTY_PROJECT`. Form modal styled to match Clients.jsx's `Add Client` modal.

## STYLE RULES — re-read from DESIGN-SYSTEM.md
- All colors solid hex.
- Card border `1px solid #ececef`, radius 16, shadow `0 8px 26px rgba(31,42,61,0.055)`.
- Pills 9.5px uppercase 0.05em.
- Page bg `#f0f2f5`, card bg `#ffffff`.
- Reuse `KpiStrip` from Overview (add `export` to it in Overview.jsx if not exported — the only allowed Overview edit).
- Reuse `PillSelect`, `RoleGuard`, `canWrite`, `useAuth`, `apiGet/apiPost`, `toast`, `FileList`, `SkeletonBlock`.

## CONSTRAINTS
- Light theme only.
- ONE add-button per page.
- No `<table>` — CSS grid only.
- Sort tiles: priority desc, then due_date asc.
- Empty states: friendly text + icon, never a bare "No data".

## DEPLOY
```bash
cd /Users/mustafakhetran/clockwrk-dashboard
npm run build
npx wrangler pages deploy dist --project-name clockwrk-dashboard
```
Confirm the new layout renders for an `owner` user. Screenshot the page and post it back when done.
