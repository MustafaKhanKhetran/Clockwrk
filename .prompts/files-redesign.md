# Codex prompt — Files page redesign

**Read first, then follow:** `DESIGN-SYSTEM.md` and `src/pages/Clients.jsx` (reference). Mirror that layout exactly. Edit ONLY `src/pages/Files.jsx` and `src/pages/Files.css`.

## Data — `/api/files`
Returns `{ files: [{ key, name, size, last_modified, content_type, folder, uploaded_by, entity_type, entity_id }], folders: string[] }`. Upload: `POST /api/files/upload` (multipart `file` + `folder`). Delete: `DELETE /api/files?key=...`. Signed URL: `GET /api/files/url?key=...`.

Helpers already in current Files.jsx: `fmtSize`, `fmtDate`, `basename`, `parentPath`, `joinPath`. Keep them.

Derive: `byFolder`, `byType` (image/video/doc/sheet/archive/other from `content_type`/extension), `totalSize`, recent 5 by `last_modified`.

## Page-specific bits

**Header:** `Files · {count}`, subline "All client, project, and team assets in one place.", date pill + `+ Upload`.

**KPI strip (4):**
1. Total Files (indigo, FileText)
2. Storage Used (green, Archive) — `fmtSize(totalSize)`
3. Uploaded Today (blue, Upload)
4. Categories (amber, Layers3) — distinct folders

**Main column:**
- Breadcrumb bar above filters: `Files / {folder} / ...` with ChevronRight, each crumb is a button.
- Filter bar: search by name, Type PillSelect (All/image/doc/sheet/video/archive/other), Owner PillSelect (All/Mine/Team), view-toggle (Grid/List, default Grid).
- **Grid view tiles**: `aspect-ratio: 1/1.18`. Top is a `aspect-ratio: 1/0.75` preview area — if image, render thumbnail from signed URL (cache); else big 32px icon coloured by type (image `#7e5bef`, video `#e44939`, doc `#6ea6d5`, sheet `#16a36a`, archive `#c6911d`, other `#7b8495`). Bottom: filename (2-line clamp) + size · relative date. Hover shows top-right download/delete floating row.
- **List view columns**: `[icon 32] [Name 1.5fr] [Folder 110] [Type 90] [Owner 130] [Size 80] [Updated 100] [Actions 80]`.

**Side column (4 cards):**
1. Storage hero (POSITIVE) — big `fmtSize(totalSize)`, caption "across {N} folders".
2. Largest items — DANGER style if any file > 200MB exists, else neutral white. Top 4 by size, click → drawer.
3. Type Mix — horizontal bars per type with counts, colours match tile palette.
4. Recently uploaded — last 4 by `last_modified`.

**Drawer tabs:** Preview · Metadata · Related · Versions.
- Preview: image thumb if image, else big icon + Open button (signed URL).
- Metadata 2-col: filename, folder, size, type, uploaded_by, last_modified, linked entity (links to `/clients/X` or `/projects/X`).
- Related: other files in the same folder (up to 6 rows).
- Versions: "Coming soon" placeholder.
- Footer: Download · Move to folder (PillSelect) · Delete (red, `canWrite` only).

**Upload modal:** PillSelect of folders (with "Create new" affordance) at the top, big dashed dropzone (200px tall, `--line` border) below. Multi-file. Per-file lime progress bar. Use existing `apiFetch` for multipart.

## Constraints
Light theme only. Solid colours. No `<table>`. Reuse `RoleGuard`, `useAuth`, `toast`, `PillSelect`, `apiGet/apiPost/apiFetch`, `KpiStrip` (export it from Overview.jsx if needed — that's the only allowed Overview edit).

## Deploy
```bash
cd /Users/mustafakhetran/clockwrk-dashboard && npm run build && npx wrangler pages deploy dist --project-name clockwrk-dashboard
```
