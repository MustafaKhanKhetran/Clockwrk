# Clockwrk Dashboard — Design System

> Single source of truth for the visual language used across all pages.
> Update this file whenever the system evolves. New pages MUST follow this spec.

**Reference pages:** `src/pages/Overview.jsx`, `src/pages/Clients.jsx` and their CSS files.

---

## 1. Core principles

1. **Light pearl background, white cards.** The page background is always `#f0f2f5`. Cards are always `#ffffff`. There's no dark mode for the redesigned pages.
2. **Full-opacity colors only.** No `rgba(... , 0.X)`, no `color/X%`, no `color-mix()` on surfaces, borders, fills, or text. Shadows are the only exception (they need alpha or look harsh).
3. **One header pattern across every page.** Big greeting/title on the left, date pill + action buttons on the right.
4. **Two-column grid** (`minmax(0, 1fr) 360px`) on every dashboard-style page. Main column = primary content; side column = compact summary cards.
5. **KPI strip at the top.** Four cards, one per metric. Reuses the global `.ov-kpi-*` classes.
6. **Rounded cards, soft shadow, no thick borders.** `border-radius: 16px`, `border: 1px solid #ececef`, `box-shadow: 0 8px 26px rgba(31,42,61,0.055)`. Hover lifts 2px.
7. **Pills for status/plan/priority.** Uppercase 9.5px text, 0.05em letter-spacing, full-opacity colored backgrounds.

---

## 2. Color tokens

Declare these as CSS vars on the page's root container (e.g. `.projects-page`, `.files-page`):

```css
--bg:      #f0f2f5;   /* page */
--card:    #ffffff;   /* card surface */
--ink:     #172033;   /* primary text */
--muted:   #7b8495;   /* secondary text */
--line:    #e4e8ee;   /* 1px dividers, card borders (solid) */
--soft:    #f6f7f9;   /* stat tile bg, hover row bg */
--ink-dim: #4f596b;   /* tertiary text */

--green:   #16a36a;   /* success */
--red:     #e44939;   /* danger */
--amber:   #c6911d;   /* warning */
--blue:    #6ea6d5;   /* links */
--indigo:  #356f9f;   /* alt accent */
--purple:  #7e5bef;   /* alt accent */
```

### Solid pill palette

These are the only background colors allowed on status / plan / type pills. Pick the closest semantic match.

| Use                    | BG          | Text       |
|------------------------|-------------|------------|
| Neutral / default       | `#737375`   | `#ffffff`  |
| Brand orange (business) | `#F26522`   | `#ffffff`  |
| Brand lime (enterprise) | `#ABE847`   | `#000000`  |
| Active / success        | `#ABE847`   | `#172033`  |
| Paused / warning        | `#f5da0b`   | `#172033`  |
| Cancelled / danger      | `#e44939`   | `#ffffff`  |
| Info / In progress      | `#cfe2ff`   | `#1d4ed8`  |
| Soft chip               | `#f6f7f9`   | `#4f596b`  |

### "Hero" card variants

The Clients page has two highlight cards in the side column. Reuse this pattern wherever you want a single card to stand out from the white stack:

- **Top-of-class / positive hero**: `background: #8ee61f; color: #0b0d10;` with kicker text `#244000`.
- **Risk / negative hero**: `background: #080b0f; color: #ffffff;` with kicker text `#ff6b5f`.

---

## 3. Typography

```css
--font-body: <existing var>;
```

| Token         | Size              | Weight | Use                                  |
|---------------|-------------------|--------|--------------------------------------|
| Greeting / page title | `clamp(26px, 3vw, 38px)` | 400 + bold strong | `<h1>` on every page header |
| Card title (`<h2>`) | 18px         | 600    | Side card titles                     |
| Big number    | 32px              | 700    | Side card hero values                |
| Tile name     | 15px              | 600    | List/tile primary text               |
| Body          | 13px              | 500    | Sublines, table cells                |
| Caption       | 11–12px           | 500    | Meta, sublines                       |
| Kicker        | 10px UPPERCASE 0.08em letter-spacing | 700 | Card kickers above titles |
| Pill          | 9.5px UPPERCASE 0.05em letter-spacing | 700 | Status / plan pills |
| Table header  | 10px UPPERCASE 0.06em letter-spacing | 700 | List view column headers |

`letter-spacing: -0.025em` on `<h2>`s, `-0.04em` on big numbers and greetings.

---

## 4. Spacing, radius, shadows

```css
/* card */
border: 1px solid #ececef;          /* solid line — never rgba */
border-radius: 16px;
box-shadow: 0 8px 26px rgba(31,42,61,0.055);
transition: transform .18s ease, box-shadow .18s ease;

/* card hover (only for clickable side cards / tiles) */
transform: translateY(-2px);
box-shadow: 0 14px 32px rgba(31,42,61,0.08);

/* tile (inside a list card) */
border: 1.5px solid #e4e8ee;
border-radius: 18px;
padding: 14px;

/* pill / button */
border-radius: 999px;

/* small inner blocks (stat squares inside tiles) */
border-radius: 10px;
background: #f6f7f9;
```

Page-level padding: `padding-top: 14px` on the root, sections gap `16px`.

---

## 5. Page skeleton

Every redesigned page starts from this skeleton.

```jsx
<DashLayout>
  <div className="{pagekey}-page">
    {/* 1. Header */}
    <header className="{key}-header">
      <div className="{key}-header-left">
        <h1 className="{key}-greeting">{Page title}<strong> · {count}</strong></h1>
        <p className="{key}-subline">{one-line context}</p>
      </div>
      <div className="{key}-header-actions">
        <div className="{key}-date"><CalendarDays size={15} /><span>{todayLabel}</span></div>
        {canCreate && <button className="{key}-add-btn"><Plus size={15}/> {Add new}</button>}
      </div>
    </header>

    {/* 2. KPI strip — reuse global .ov-kpi-strip + .ov-kpi-card classes */}
    <KpiStrip cards={[...]} />

    {/* 3. Two-column grid */}
    <div className="{key}-grid">
      <div className="{key}-main-column">
        {/* filters + primary list/table */}
      </div>
      <div className="{key}-side-column">
        {/* 3-4 small summary cards */}
      </div>
    </div>

    {/* 4. Drawer (right-side, click row to open) */}
    {selected && <DrawerComponent ... />}

    {/* 5. Add modal (optional) */}
    {showAdd && <AddModal ... />}
  </div>
</DashLayout>
```

```css
.{key}-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}
.{key}-main-column, .{key}-side-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (max-width: 1100px) {
  .{key}-grid { grid-template-columns: 1fr; }
  .{key}-side-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 800px) {
  .{key}-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

---

## 6. Header pattern

```css
.{key}-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.{key}-greeting { color: var(--ink); font-size: clamp(26px, 3vw, 38px); font-weight: 400; letter-spacing: -0.04em; line-height: 1.05; }
.{key}-greeting strong { font: inherit; font-weight: 700; color: var(--ink); }
.{key}-subline { margin-top: 7px; color: var(--muted); font-size: 13px; }
.{key}-header-actions { display: flex; align-items: center; gap: 10px; }
.{key}-date {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 13px; border: 1px solid var(--line); border-radius: 999px;
  background: #ffffff; color: #657083;
  font-size: 11px; font-weight: 600;
}
.{key}-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  border: 0; border-radius: 999px;
  background: var(--ink); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform .15s ease, background .15s ease;
}
.{key}-add-btn:hover { transform: translateY(-1px); background: #2a3552; }
```

---

## 7. KPI strip

Reuse the global classes `.ov-kpi-strip`, `.ov-kpi-card`, `.ov-kpi-icon`, `.ov-kpi-copy`, `.ov-tone-*`. Render via the `KpiStrip` component (imported from Overview.jsx — add `export` to it if not yet exported). Override only what's needed.

```css
.{key}-kpi-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.{key}-page .ov-kpi-icon { background: #080b0f !important; }
.{key}-page .ov-tone-green .ov-kpi-icon { color: #8ee61f; }
.{key}-page .ov-tone-red .ov-kpi-icon { color: var(--red); }
.{key}-page .ov-tone-amber .ov-kpi-icon { color: var(--red); }
.{key}-page .ov-tone-blue .ov-kpi-icon { color: #356f9f; }
.{key}-page .ov-tone-indigo .ov-kpi-icon, .{key}-page .ov-tone-white .ov-kpi-icon { color: #fff; }
```

---

## 8. Filter bar (above primary list)

```jsx
<div className="{key}-filter-bar">
  <div className="{key}-search-wrap">
    <Search size={14} />
    <input className="{key}-search" placeholder="Search…" value={q} onChange={...} />
  </div>
  <PillSelect ... />
  <PillSelect ... />
  <div className="{key}-view-toggle">
    <button className={view==='cards'?'is-active':''}>Cards</button>
    <button className={view==='list' ?'is-active':''}>List</button>
  </div>
</div>
```

```css
.{key}-search { height: 44px; padding: 0 14px 0 36px; border: 1px solid var(--line); border-radius: 999px; background: #fff; font-size: 13px; }
.{key}-view-toggle { display: inline-flex; padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: #fff; }
.{key}-view-toggle button { padding: 5px 14px; border: 0; background: transparent; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; }
.{key}-view-toggle button.is-active { background: var(--ink); color: #fff; }
.{key}-page .pill-select-icon { color: #fff; background: #0b0d10 !important; }
```

---

## 9. Primary "List card" — two view modes

Wrap the list inside a `.tw-card` (`.{key}-list-card`). Render either Cards or List based on the user's toggle. **All pages MUST support both views.**

### Cards mosaic

```css
.{key}-mosaic {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.{key}-tile {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 18px;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.{key}-tile:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(31,42,61,0.10); border-color: var(--blue); }
.{key}-tile-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.{key}-tile-avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 14px; color: #1a1a1a; flex-shrink: 0; background: #d9dee7; }
.{key}-tile-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.{key}-tile-stat { padding: 8px 10px; background: var(--soft); border-radius: 10px; }
.{key}-tile-stat strong { display: block; font-size: 18px; font-weight: 700; color: var(--ink); line-height: 1; }
.{key}-tile-stat span { display: block; font-size: 10.5px; color: var(--muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.{key}-tile-foot { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); border-top: 1px solid #eef0f3; padding-top: 8px; }
```

Use the avatar's background as a deterministic pastel from `nameColor(name)` (existing helper in Overview.jsx at ~line 948). Palette: `['#f4d35e','#1ec38b','#f7a072','#d6f0e0','#e3d7ff','#ffd6e0','#d0e0ff']`.

### List view (CSS-grid table, no `<table>`)

Use a header row in kicker style + data rows below.

```css
.{key}-list { width: 100%; min-width: 0; display: flex; flex-direction: column; }
.{key}-list-head, .{key}-list-row {
  display: grid;
  grid-template-columns: <columns>;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
}
.{key}-list-head { border-bottom: 1px solid var(--line); }
.{key}-list-head span { text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; color: var(--muted); font-weight: 700; }
.{key}-list-row { border-bottom: 1px solid #eef0f3; cursor: pointer; transition: background .15s ease; }
.{key}-list-row:hover { background: var(--soft); }
.{key}-list-row:last-child { border-bottom: 0; }
```

---

## 10. Side column cards

Each side card is a `.tw-card` with this anatomy:

```jsx
<section className="tw-card {key}-side-card">
  <span className="tw-kicker">{KICKER}</span>
  <h2>{Title}</h2>
  <strong className="cl-big">{Big number / hero value}</strong>
  <span className="cl-side-caption">{caption}</span>
  {/* OR a list of rows */}
  <div className="{key}-side-list">{rows...}</div>
</section>
```

Reuse the existing global classes `.tw-kicker`, `.cl-big`, `.cl-side-list`, `.cl-side-row`, `.cl-link`. They're defined in `Clients.css` and should be promoted to a shared sheet if used by 3+ pages.

There must always be exactly **one "positive hero" card** (green `#8ee61f` background) and **one "danger hero" card** (dark `#080b0f` background) per page, surrounded by 1-2 neutral cards.

---

## 11. Drawer

Click any row/tile → open a right-side drawer.

```css
.{key}-drawer {
  width: 480px; max-width: 95vw; height: 100vh;
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: 24px 0 0 24px;
  box-shadow: -20px 0 50px rgba(0,0,0,0.12);
  background: #fff;
}
.{key}-drawer-hero {
  position: relative;
  display: flex; align-items: center; gap: 16px;
  padding: 28px 52px 22px 28px;
}
/* Optional hero tint matching the row's primary attribute (plan / priority / status) */
.{key}-drawer-hero.tint-blue   { background: linear-gradient(180deg, #e6f0fd, #fff); }
.{key}-drawer-hero.tint-green  { background: linear-gradient(180deg, #e9f7d2, #fff); }
.{key}-drawer-hero.tint-grey   { background: linear-gradient(180deg, #eef1f5, #fff); }
.{key}-drawer-tabs {
  display: flex; gap: 4px;
  padding: 0 22px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto; scrollbar-width: none;
}
.{key}-drawer-tab { padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.{key}-drawer-tab.is-active { border-bottom-color: var(--ink); color: var(--ink); }
.{key}-drawer-body { flex: 1; overflow-y: auto; padding: 22px 28px; }
.{key}-drawer-foot { display: flex; gap: 8px; padding: 14px 22px; border-top: 1px solid var(--line); }

.{key}-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.{key}-detail-grid > span { padding: 13px; border-radius: 12px; background: var(--soft); }
.{key}-detail-grid small { display: block; margin-bottom: 5px; color: var(--muted); font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.{key}-detail-grid strong { display: block; color: var(--ink); font-size: 12px; font-weight: 600; text-transform: capitalize; }
```

Tab structure — every drawer has these tabs in this order (skip those that don't apply):
**Overview · Activity · Files · Communications · Billing/Actions**

---

## 12. Pill components

```css
/* base */
.pill {
  display: inline-flex; align-items: center;
  width: max-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: .05em;
  text-transform: uppercase;
}
```

Variants — see "Solid pill palette" in §2.

---

## 13. Icons

Use **Lucide React** icons. Common imports per page:
`CalendarDays, Plus, Search, Users, DollarSign, Banknote, Bell, Layers3, BriefcaseBusiness, FileText, Clock3, FolderOpen, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpRight, ArrowDownRight`.

Stroke width 1.75 in the sidebar, otherwise default (2).

---

## 14. Conventions

- **No `<table>`.** Always CSS grid.
- **No semi-transparent surfaces.** Colors must be solid hex equivalents.
- **All copy in title case for headings, sentence case for paragraphs.** Pills are UPPERCASE.
- **Never invent backend fields.** Read what `/api/*` actually returns before designing a card. If a field is missing, surface it in the prompt — backend gets fixed first.
- **One add-button per page** (top right). Modal for create, drawer for read/update.
- **Light theme only.** All redesigned pages skip dark-mode handling.
- **Build + deploy after every page redesign:**
  ```bash
  cd /Users/mustafakhetran/clockwrk-dashboard
  npm run build
  npx wrangler pages deploy dist --project-name clockwrk-dashboard
  ```

---

## 15. Change log

| Date       | Change                                              |
|------------|-----------------------------------------------------|
| 2026-06-16 | Initial extraction from Overview + Clients pages.   |
