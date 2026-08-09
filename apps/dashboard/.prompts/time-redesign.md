# Codex prompt — Time page redesign

**Read first, then follow:** `DESIGN-SYSTEM.md` and `src/pages/Clients.jsx` (reference). Mirror that layout exactly. Edit ONLY `src/pages/Time.jsx` and `src/pages/Time.css`.

## Data — `/api/time-logs`
Returns: `{ id, request_id, project_id, employee_id, employee_name, project_name, request_title, client_name, hours, description, log_date: 'YYYY-MM-DD', created_at }`. Create: `POST /api/time-logs` with `EMPTY_LOG` shape.

Derive: `byDay` (current week), `byEmployee`, `byProject`, `weekTotal`, `monthTotal`, `todayTotal`, `utilization = employeeHoursThisWeek / 40`. Period state drives all KPIs and the chart (`week | month | custom`).

## Page-specific bits

**Header:** `Time Tracking`, subline "How the team is spending its hours.", date pill + `+ Log Time` + period PillSelect (`This Week / This Month / Custom`).

**KPI strip (4):**
1. Today (indigo, Clock3) — `todayTotal h`
2. This Week (green, ArrowUpRight) — `weekTotal h`, green if ≥200, amber 100-200, red <100
3. Billable % (blue, DollarSign) — placeholder 100% labelled "All billable"
4. Active Loggers (amber, Users) — distinct `employee_id` in period

**Main column:**
- **Chart card** `.tm-chart-card`: title "Hours logged · {period}". Inline SVG line+area chart of hours per day (week view) or per week (month view). Reuse the `smoothPath` helper from Overview.jsx's MoneyLineChart. Lime fill, dark stroke. Hover tooltip = date + total + top-3 employees.
- Filter bar: search (description/project/client), Employee PillSelect, Project PillSelect, view-toggle (Calendar/List, default Calendar).
- **Calendar view**: 7-col grid M-T-W-T-F-S-S for current week. Each cell: big total hours + stack of 1-4 colored chips for top projects. Border amber if `>8h`, red if `>10h`. Click cell → drawer with that day's logs.
- **List view columns**: `[avatar 32] [Employee 1fr] [Project 1.4fr] [Description 1.6fr] [Hours 70] [Date 100]`. Hours bold, red if `≥8`. Click row → drawer with that single log.

**Side column (4 cards):**
1. Top logger (POSITIVE HERO) — most hours this week, big `{hours}h`, caption "across N projects", "View profile →" link.
2. Under-utilised (DANGER HERO) — `{N} below target`, list up to 4 employees with `<30h/week`: avatar + name + `{hours}h / 40h`.
3. Project Mix — horizontal bars per project (top 6) with distinct pastels from the existing palette.
4. Recent logs — last 4: employee avatar + project + hours + relative time.

**Drawer tabs:** Logs · Employee · Project · Client.
- Logs: all logs for selected slice (day / row / chart point). Each: avatar + employee + project + description + hours + log_date. Inline edit hours if `canManage`.
- Employee/Project/Client tabs: aggregate stats for that entity in the period — total hours, top contributors/projects, billable %.
- Footer: `+ Add log` button if opened from a day cell.

**Add Log modal:** Employee PillSelect, Project PillSelect, Request PillSelect (optional, filtered by project), Date input, Hours number (step 0.25), Description textarea, Billable toggle. Quick chips above form: `Today / Yesterday / This morning / This afternoon` (pre-fills date + suggested hours).

## Constraints
Light theme. Solid colours. Inline SVG (no chart lib). Reuse `RoleGuard`, `useAuth`, `canWrite`, `toast`, `PillSelect`, `callDashboardApi`, `getList`, `KpiStrip`, `smoothPath`/`nameColor` from Overview.jsx.

## Deploy
```bash
cd /Users/mustafakhetran/clockwrk-dashboard && npm run build && npx wrangler pages deploy dist --project-name clockwrk-dashboard
```
