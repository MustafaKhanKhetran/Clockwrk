# Codex prompt — Requests page redesign

**Read first, then follow:** `DESIGN-SYSTEM.md` and `src/pages/Clients.jsx` (reference). Mirror that layout exactly. Edit ONLY `src/pages/Requests.jsx` and `src/pages/Requests.css`.

## Data — `/api/requests`
Returns rows: `{ id, title, description, type, status: 'queue'|'in_progress'|'in_review'|'revision'|'completed'|'cancelled', priority: 'low'|'normal'|'high'|'urgent', client_id, client_name, client_company, project_id, project_name, assigned_to, assigned_to_name, due_date, completed_at, created_at, updated_at, estimated_hours, completion_percent, approval_status: 'pending'|'approved'|'rejected', comment_count }`.

Comments: `GET /api/requests/:id/comments`, `POST /api/requests/:id/comments`.

Derive: `isOverdue = due_date && due < today && !['completed','cancelled'].includes(status)`. `activeStatuses = ['queue','in_progress','in_review','revision']`. `daysOpen = today - created_at`.

## Page-specific bits

**Header:** `Requests · {count}`, subline "Everything the team is delivering.", date pill + `+ New Request`.

**KPI strip (4):**
1. Active (indigo, Layers3)
2. Overdue (red, Bell)
3. In Review (amber, Clock3)
4. Completed This Week (green, ArrowUpRight) — `completed_at` within last 7 days.

**Main column:**
- **Filter tabs** above the list card — pill segmented control with counts: `Overdue (N) · Active (N) · In review (N) · Mine (N) · All (N)`. Default = Overdue if N>0 else Active.
- Filter bar: search (title/client/assignee), Status PillSelect, Priority PillSelect, Type PillSelect, view-toggle (Board/List, default Board).
- **Board view**: 4 columns `Queue · In Progress · In Review · Revision`. Column header = kicker + count + small `+` button (owner/admin/PM only). Cards stack inside, click → drawer (no drag yet).
  - Card design: priority dot top-left (urgent red, high amber, normal blue, low grey) + title (14px/600, 2-line clamp). Below: client_name + project_name (11px muted). Footer: 24px assignee avatar + due date (red if overdue, blue if today) + comment count icon. 16px padding, 14px radius, hover lifts + blue border.
- **List view columns**: `[priority dot 14] [Title + client 1.4fr] [Status 110] [Type 100] [Assignee 130] [Due 110] [Progress 100] [Hours 70]`.

**Side column (4 cards):**
1. Today's wins (POSITIVE HERO) — count completed today, caption "Marked complete today", list 3 most recent.
2. Overdue queue (DANGER HERO) — `{N} requests past due`, list 4 with title + days late + assignee.
3. Type Mix — horizontal bars per type (design / development / bug / revision / support / content / meeting / admin).
4. Top assignees — top 4 employees by active count: avatar + name + count.

**Drawer tabs:** Overview · Activity · Files · Comments.
- Hero tint by priority: urgent→red, high→amber, normal→blue, low→grey.
- Overview: 2-col detail grid — Title, Client, Project, Type, Status, Priority, Assignee, Due, Estimated Hours, Completion %, Approval Status. Below: description / internal_notes / revision_notes blocks (only if non-empty).
- Activity: timeline of `created_at`, `updated_at`, `completed_at` for now. TODO note for `/api/requests/:id/activity`.
- Files: `<FileList entityType="request" entityId={id} canManage={canWrite}/>`.
- Comments: list from GET, composer (textarea + Send → POST) at bottom.
- Footer: status-change pill buttons (Queue/In Progress/In Review/Revision/Complete/Cancel — disable current). Approve/Reject pair if `approval_status === 'pending'`.

**Add modal:** reuse existing `EMPTY_REQUEST` shape from current file.

## Constraints
Light theme. Solid colours. No drag-drop (read-only board). Reuse `RoleGuard`, `useAuth`, `canWrite`, `toast`, `PillSelect`, `FileList`, `callDashboardApi`, `getList`, `KpiStrip`.

## Deploy
```bash
cd /Users/mustafakhetran/clockwrk-dashboard && npm run build && npx wrangler pages deploy dist --project-name clockwrk-dashboard
```
