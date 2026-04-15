# Project Logs

This file is the canonical change history for the project.

Rules for future AI editors:

1. Read `README.md` first for project context and architecture notes.
2. Read `logs.md` second for implementation history before making changes.
3. Review the last 5 entries in `logs.md` before making any new change.
4. After every change, add a new log entry here.
5. Every log entry must include:
   - Date and local time
   - Author name
   - Files changed
   - What changed
   - Why it changed
   - Any bug cause, trap, or follow-up context another AI should know

## 2026-04-13 PKT (multi-drop)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/services.css`, `script.js`

Details:
- Refactored services dropzone to support multiple dropped services.
- Replaced `.services-drop-selected-row` (single static pill) with an empty `.services-drop-selected-list` populated dynamically by JS.
- Each dropped service gets a `.services-drop-selected-item` row with its own `.services-drop-remove-single` (58×58px circle) created in JS.
- `activeDroppedService` (single object) → `activeDroppedServices` (array). Each entry stores `{ pill, parent, nextSibling }` so pills can be restored to their exact original position.
- `addDroppedService` guards against adding the same pill twice; appends a new item to the list each drop.
- `removeDroppedService(pill, itemEl)` restores the specific pill by index, removes the item row, and hides the dropzone if empty.
- `updateDropzonePlanCopy` sets "That 1 service" vs "Those N services" based on count.
- Removed `servicesDropRemove` big circle button from HTML and its JS event listener — per-pill removes replace it.
- Removed `servicesDropFilled` and `servicesDropSelectedLabel` JS vars (no longer needed).
- X button size: 58px to match pill height per reference screenshot.

Context for future AI:
- Pills that are dragged into the dropzone are physically removed from their `.services-request-list` and restored via `removeDroppedService`. If you modify pill structure, also update the `innerHTML` template inside `addDroppedService`.
- The `.services-drop-selected-list` is scrollable (`max-height: 200px; overflow-y: auto`) for when many services are dropped.

## 2026-04-13 PKT
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/services.css`

Details:
- Wrapped `.services-drop-plan-copy`, `.services-drop-plans`, and `.services-drop-actions` in a new `.services-drop-bottom` div inside `.services-drop-filled`.
- `.services-drop-filled` now has exactly 2 flex children (selected-row + bottom wrapper), so `justify-content: space-between` correctly pushes them to top and bottom with a large empty space in between.
- Removed `margin-top: auto` from `.services-drop-plan-copy` (no longer needed).
- Removed `margin-top: 18px` from `.services-drop-plans` and `margin-top: 24px` from `.services-drop-actions` — spacing is now handled by the `gap: 18px` on `.services-drop-bottom`.
- Reduced `.services-drop-plan-copy` font size from `clamp(24px, 2.6vw, 30px)` to `clamp(18px, 2vw, 22px)` to match reference.

Why:
- The previous structure had 4 direct flex children under `space-between`, distributing space between every item instead of creating one large gap above the bottom block. User's reference screenshot clearly shows selected pill at top, large empty area, then all plan/action content bunched at bottom.

Context for future AI:
- `.services-drop-filled` is only shown when `.services-dropzone-has-items` class is present (added by `addDroppedService()` in script.js).
- The `.services-drop-bottom` wrapper is a pure layout container — do not add interactivity or animation to it.
- If the gap between selected-row and bottom content ever needs to shrink, adjust `min-height` on `.services-dropzone-inner` or add a `max-height` to `.services-drop-filled`.

## 2026-04-12 21:27:33 PKT
Author: Codex
Files changed: `script.js`

Details:
- Rewrote the Start Engagement Kanban animation logic to follow the exact user-requested flow.
- The real bottom Progress card now becomes the flying active card.
- The old Done card fades out shortly before arrival.
- The same flying card lands in Done and stays there instead of disappearing and being swapped with a new fake row.
- The top Progress card now slides down using a FLIP-style layout animation.
- A new non-active Progress card fades in from the left into the top slot.

Why:
- The previous implementation still used a fake swap/crossfade at the landing point, which did not match the requested “same card flies in and stays” behavior.

Context for future AI:
- The flying card is now the actual former bottom Progress row moved into overlay space and then inserted into the Done board on finish.
- Do not reintroduce a landing crossfade unless the user explicitly asks for that behavior.
- The Progress-tab slide-down now depends on measuring the old and new top-row positions before/after insertion; if the board structure changes, re-check the FLIP calculation around `deltaTopY`.

## 2026-04-12 21:23:55 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Reworked only the Discovery session card layout and padding to follow the provided reference more closely while keeping the existing interaction logic and center-check animation.
- Shifted the first Process card toward a top-anchored visual layout with the visual block above and the title/copy pushed below, closer to the reference structure.
- Tightened the mini-card width, spacing, avatar sizing, and overall padding for the first card so the Discovery layout reads more like the provided example instead of the earlier oversized custom version.

Why:
- The user asked to extract only the Discovery session layout and padding from the provided reference and keep the current logic/animations as they are.

Context for future AI:
- This pass intentionally targeted only `.process-card:first-child` layout behavior.
- If Discovery visual styling changes again, avoid touching the animation selectors unless the user explicitly asks to change the animation behavior.

## 2026-04-12 15:01:27 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Re-aligned the mobile Discovery session card to match the provided reference layout and padding more closely.
- Restored the first card to a top-anchored visual layout with centered mini-cards, tighter mini-card width, and spacing that mirrors the reference structure rather than the previous oversized custom layout.
- Kept the Discovery interaction logic and center-check animation intact.

Why:
- The user wanted the Discovery session layout and padding extracted from the provided reference while preserving the current animation behavior.

Context for future AI:
- This change intentionally narrows the mobile Discovery mini-cards again to match the reference card proportions.
- If further Discovery tweaks are needed, preserve the animation selectors and prefer adjusting only `.process-card:first-child ...` layout rules.

## 2026-04-12 14:59:00 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Fixed the mobile Discovery session outer-card layout so the `Clockwrk` and `You` mini-cards sit in the center of the main card again.
- Overrode the first card’s inherited flex distribution by setting `.process-card:first-child` to center its content stack on mobile and slightly tightening its internal copy spacing.

Why:
- The user had undone earlier changes and the two mini-cards were once again pinned toward the top of the Discovery session card.

Context for future AI:
- This issue was caused by the base `.process-card` using `justify-content: space-between`.
- If the Discovery visual drifts upward again on mobile, check `.process-card:first-child` inside the `@media (max-width: 520px)` block before changing panel sizes or gaps.

## 2026-04-12 14:55:42 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Fixed the mobile Discovery session card layout so its visual content is no longer pinned to the top of the outer card.
- Centered the first card’s internal vertical distribution by targeting `.process-card:first-child` in the mobile breakpoint and tightening the copy spacing slightly.

Why:
- The user pointed out that the Discovery mini-cards were attached to the top of the outer card instead of sitting more centrally.

Context for future AI:
- This was a layout-distribution fix, not a size fix.
- If the Discovery card looks top-heavy again on mobile, check `.process-card:first-child` inside `@media (max-width: 520px)` before changing panel sizes.

## 2026-04-12 14:53:55 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Increased the size of the Discovery session mini-cards in mobile view only.
- Enlarged the panel width, padding, label sizing, avatar sizing, and center check-circle sizing while keeping the visual centered.

Why:
- The user wanted the Discovery session cards bigger and centered on mobile without changing the desktop version.

Context for future AI:
- These changes are scoped to the mobile Discovery-specific selectors under `@media (max-width: 520px)`.
- If the first Process card needs more tuning later, prefer changing `.process-card:first-child ...` rules rather than the shared `.process-panel` base rules.

## 2026-04-11 22:05:51 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Added targeted mobile rules for Process card 01 (Discovery session) to restore the centered visual layout after the previous mobile sizing changes.
- Centered the two mini-cards on mobile, increased their size slightly, and enlarged the green check circle and inner checkmark so the animation fills the middle more cleanly again.

Why:
- The user reported that the Discovery mobile visual used to look correct and became worse after the last sizing changes; they wanted the middle check state centered and scaled up nicely again.

Context for future AI:
- Discovery session mobile styling is now intentionally more specific than the shared `.process-panel` mobile rules.
- If the first Process card changes again, prefer targeted `.process-card:first-child` mobile rules so adjustments do not unintentionally affect the Kanban or other cards.

## 2026-04-11 22:02:59 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Rebalanced the mobile Process grid so the four main cards share a consistent outer height.
- Adjusted the Start Engagement mobile Kanban boards to be shorter and wider.
- Resized the inner task cards, footer spacing, and flying card so the wider/shorter board proportions still feel coherent.

Why:
- The user wanted the mobile `In progress` and `Done` boards to be shorter but wider, with the overall four main cards feeling like the same size.

Context for future AI:
- On mobile, equal-looking outer card height now comes from the shared `.process-card` min-height inside `@media (max-width: 520px)`.
- The Start Engagement card still has its own targeted mobile rules, but its min-height is now aligned with the other cards.
- If the board widths change again, re-check the dynamic landing path in `script.js` and the `.process-fly-card` absolute `top/left` values together.

## 2026-04-11 22:00:49 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Increased the size of the two mini-cards inside the Discovery session visual by enlarging the panel width, padding, corner radius, header spacing, and avatar size.
- Added mobile-specific sizing so those same cards still resize cleanly on phones instead of overflowing or staying oversized.

Why:
- The user wanted the Discovery session cards to feel larger while still behaving properly in the mobile layout.

Context for future AI:
- Discovery card visual balance now depends on both the base `.process-panel` sizing and the mobile overrides inside `@media (max-width: 520px)`.
- If the center green-circle animation feels misaligned after future panel-size changes, re-check `.process-panels-wrap` gap and `.process-connect` centering together.

## 2026-04-11 21:57:15 PKT
Author: Codex
Files changed: `styles/process.css`, `script.js`

Details:
- Tuned the Start Engagement card back down from the previous oversize pass so it is only tall enough to fit the task cards cleanly.
- Made the mobile Kanban boards and flying task card slightly wider.
- Increased the main Process card title size slightly.
- Replaced the hard-coded Kanban flight distance in `script.js` with a dynamic measurement-based path so the flying card still lands correctly under the `Done` title after board width changes.

Why:
- The user wanted the boards less tall than the previous pass, the task cards slightly wider, and the main card titles slightly larger, without breaking the landing animation.

Context for future AI:
- The Start Engagement mobile layout now depends on both CSS proportions and JS-calculated flight deltas.
- Do not assume fixed `translateX(148px)` / `translateY(-62px)` values anymore; the script now derives the landing path from the current DOM geometry.
- If board padding, header spacing, or absolute `left/top` values on `.process-fly-card` change, re-check the measured landing path visually.

## 2026-04-11 21:55:05 PKT
Author: Codex
Files changed: `styles/process.css`

Details:
- Increased the height of the Start Engagement card and both Kanban board columns so incoming and existing task cards fit without clipping.
- Raised the base `.process-visual-board` and `.process-board` minimum heights, and increased the mobile `:nth-child(2)` card/board minimum heights further for the small-screen layout.

Why:
- The user reported that new cards were clipping as they appeared, and wanted both task cards to fit naturally without having to shrink the visuals.

Context for future AI:
- For this Kanban card, clipping is controlled more by board/card min-heights than by the animation path itself.
- If task row height or footer spacing increases again, adjust the Start Engagement card and board min-heights together so the board can hold the header, two rows, and the footer comfortably.

## 2026-04-11 21:53:14 PKT
Author: Codex
Files changed: `script.js`

Details:
- Fixed the Start Engagement Kanban landing logic so the arriving card in the `Done` board is inserted directly under the `Done` title instead of being appended at the bottom of the board.
- Replaced the old top-insertion helper name with `insertRowAfterHeader` and used it for both the landed `Done` card and the replenished `In progress` card.

Why:
- The user wanted the landed card to sit under the `Done` heading like the reference screenshot, not below the `Add a card..` footer area.

Context for future AI:
- The `Done` board now contains a footer element after the task rows. Appending new rows to the board will place them below that footer, which is visually wrong.
- Any new board-row insertion should happen immediately after the board `<p>` heading, not with plain `appendChild`, unless the intent is specifically to place content below the footer.

## 2026-04-11 21:13:40 PKT
Author: Codex
Files changed: `index.html`, `styles/process.css`

Details:
- Adjusted the mobile version of Process card 02 (Start engagement) to better match the reference proportions.
- Added `Add a card..` footer text to both Kanban columns in `index.html`.
- Refined mobile-only CSS in `styles/process.css` so the board pair stays centered, the two boards keep fixed proportions on small screens, the board columns are taller, the board headers are larger and sentence-cased, and the flying card/task rows scale more naturally on mobile.
- Changed the In Progress board header color to black so both mobile board headers match the reference more closely.

Why:
- The user wanted the mobile card to look like the provided reference image instead of a compressed desktop layout.

Context for future AI:
- The mobile Start Engagement card now relies on targeted `:nth-child(2)` rules inside the `@media (max-width: 520px)` block. If card order changes in the Process grid, these selectors will need to be updated.
- The flying card animation in `script.js` still uses fixed travel values based on the current board dimensions, so board width/spacing changes should stay coordinated with the animation path.

## 2026-04-11 PKT
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`, `script.js`

Details:
- Rewired card 02 (Start Engagement) Kanban animation path and board update logic.
- **Flight path**: Flying card now starts at the bottom row of In Progress (CSS `top: 100px`, calculated as 14px padding + 24px header + 54px row0 + 8px gap) and arcs diagonally upward to the top row of Done. Keyframes: translateX 0→148px, translateY 0→-62px with a -5deg rotation at the arc peak (offset 0.5). Previously the flight was horizontal with a slight dip.
- **Done card exit direction**: old Done card now fades out to the RIGHT (translateX +20px) instead of upward, matching the visual direction of the incoming flying card.
- **In Progress refill direction**: after flight, new backlog card is now prepended at the TOP of In Progress (via new `prependRow` helper using `insertBefore` after the `<p>` header) instead of appended at the bottom. This makes the existing card visually drop to the second slot as the new card slides in above it.
- **Active card source**: reads from `ipRows[ipRows.length - 1]` (bottom row) instead of `ipRows[0]` (top row). Bottom row is the "active" card that lifts off.

Why:
- User wanted: flying card lifts from the bottom of In Progress, arcs up-right to the top of Done; Done card fades to the right; In Progress remaining card slides down and a new card fades in at top.

Context for future AI:
- `top: 100px` on `.process-fly-card` is calculated from board dimensions. If `.process-board p` margin-bottom, `.process-task-row` height, or `.process-board gap` changes, recalculate: top = board-padding(14) + header-height(~12) + header-margin(12) + row0-height(54) + gap(8) = 100px.
- translateY in keyframes = -(row1_top - row0_top) = -(100 - 38) = -62px. Stays correct as long as row heights and gaps don't change.
- `prependRow` inserts after the `<p>` header. If the board structure changes (e.g. header becomes an `<h4>`), update the `board.querySelector("p")` selector.
- Done card fade-out setTimeout (500ms) and new Done card fadein (950ms) are tuned to the 1100ms flight. Both must be updated if flight duration changes.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`, `script.js`

Details:
- Redesigned task rows to look like proper cards (matching reference screenshot): grey background (`#efefef`), rounded corners, title label + 3 grey line bars below. Done board rows use `rgba(255,255,255,0.25)` background with white-tinted text and bars.
- HTML: static rows in both boards updated to include `.process-task-label` span + three `.process-task-line` spans. Added `data-task` attribute to each row for reliable JS name reading.
- CSS: added `.process-task-label`, `.process-task-line`, `.process-task-line:last-child` (60% width), and `--done` variants. `.process-task-row` is now `display: flex; flex-direction: column; gap: 6px`.
- JS: `makeRow()` updated to build the full card structure via `innerHTML`. Task name reader changed from `textContent.trim()` to `dataset.task` (fallback to textContent) since rows now contain child elements.

Why:
- User shared reference screenshot showing task rows styled as full cards with title + content line bars, not plain text.

Context for future AI:
- Always use `data-task` attribute on `.process-task-row` elements — both static HTML ones and JS-created ones. The `runTask()` reader depends on it.
- `.process-task-line:last-child` targets the third line bar and makes it 60% width. If the number of lines changes, update this selector.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `script.js`

Details:
- Removed deprecated `mqMobile.addListener` Safari fallback. Replaced guarded if/else with a direct `mqMobile.addEventListener("change", setViewportMode)`. Safari has supported this since v14 (2020); the fallback is no longer needed.

Why:
- IDE deprecation hint on every edit was noise. Removed the dead branch cleanly.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`, `script.js`

Details:
- Reduced task row and fly card size: `height: 54px` (fixed, box-sizing border-box), `padding: 7px 10px`, `border-radius: 8px`, label `font-size: 10px`, line `height: 4px`, `gap: 4px`. All rows guaranteed identical height.
- Fly card dimensions now exactly match task rows: `width: 108px` (= 136px board - 2×14px padding), `height: 54px`, `left: 14px` (aligned to board inner edge), `top: 40px`. Card looks like the same physical card flying.
- Fixed Done card swap timing: old Done card fades out at t=500ms (fully removed by t=760ms). New Done card fades in at t=950ms (flying card is landing). Gap between old leaving and new arriving = ~190ms of empty Done slot — clean visual break before arrival.

Why:
- Cards were too large and inconsistent. Done card was still visible when new card arrived, making the loop look cluttered.

Context for future AI:
- `height: 54px` on both `.process-task-row` and `.process-fly-card` is intentional — they must match for the "same card flying" illusion. If either changes, update both.
- translateX in the fly animation = 148px (136px board + 12px gap). This is independent of the card width/left position.
- Done card fade-out at 500ms and fade-in at 950ms are tuned to the 1100ms flight duration. If flight duration changes, adjust both timeouts proportionally.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `script.js`

Details:
- Removed unused `lastScroll` variable (declared in section 5, assigned but never read).

Why:
- IDE diagnostics cleanup.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `script.js`

Details:
- Rewrote section 9 so the static board items update in sync with the flying card.
- Two separate task arrays: `FLYING_TASKS` (what flies) and `BACKLOG_TASKS` (what replenishes In Progress). Prevents name collisions between the flying card label and the board rows.
- On each `runTask()`: top In Progress row fades out (translateY -6px, opacity 0, removed after 260ms). At 900ms (card landing), arrived task fades into top of Done. On `onfinish`, a backlog item fades into bottom of In Progress. Both boards trim to max 2 rows via `pruneTo()`.
- `makeRow` / `showRow` / `hideRow` / `addRow` / `pruneTo` are local helpers. `showRow` uses double-rAF to trigger transitions on freshly inserted DOM nodes reliably.

Why:
- User wanted the In Progress and Done board rows to visually animate in/out in sync with the flying card, not stay static.

Context for future AI:
- `hideRow` sets opacity/transform via `cssText +=` to avoid overwriting existing inline styles, then removes element after 260ms (matches 0.25s transition).
- `pruneTo` removes the LAST row (oldest Done item / overflow In Progress item). If the ordering logic needs to change, check this function.
- The 900ms `setTimeout` for adding to Done must be less than the flight duration (1100ms) so the row appears before the card fully fades out.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`, `script.js`

Details:
- Redesigned card 02 board visual to match a Kanban reference screenshot.
- HTML: replaced `<span>` bar elements with `.process-task-row` divs showing actual task names. "In progress" board shows "Pitch deck" and "Logo design"; "Done" shows "Mobile app". Replaced `.process-fly-ticket` with `.process-fly-card` (larger card with `.process-fly-title` + two `.process-fly-line` content lines).
- CSS: `.process-visual-board` now `align-items: stretch; min-height: 200px` so boards fill vertical space. `.process-board` gets `display: flex; flex-direction: column; gap: 8px`. Added `.process-task-row` (white/translucent background depending on column). `.process-fly-card` is 116px wide, absolute at `left: 10px; top: 42px` (first task row position inside In Progress).
- JS: updated section 9 to target `.process-fly-card`/`.process-fly-title`. Animation now has a 5-keyframe arc — card lifts 14px, rotates 7deg at midpoint (offset 0.5), returns to baseline at Done. Duration 1100ms. Tasks: Landing page, Pitch deck, Logo design, Social media, Brand guide.
- translateX(148px) = 136px board + 12px gap. Rotation pivot is card center (default transform-origin).

Why:
- User shared a reference screenshot showing a proper Kanban board with visible task items and a card physically flying between columns with arc motion.

Context for future AI:
- `.process-board` now has `display: flex; flex-direction: column` added by the `.process-visual-board` context. The old `.process-board span` / `.process-board-muted span` / `.process-board-accent span` CSS rules are now orphaned (those spans were removed from HTML). Safe to delete those rules when cleaning up.
- translateX in the WAAPI keyframes must match board-width + gap. Currently 148px. Update if `.process-board { width }` or `.process-board + .process-board { margin-left }` changes.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`, `script.js`

Details:
- Added flying task animation to card 02 (Start engagement).
- HTML: added `.process-fly-ticket > .process-fly-label` inside `.process-visual-board` after the two board divs.
- CSS: added `position: relative` to `.process-visual-board` so the absolute ticket is contained within it. Fly ticket is `position: absolute; left: 14px; top: 38px` (inside In Progress board padding/header area), `width: 108px` (136px board - 2×14px padding), `z-index: 10`, `opacity: 0` by default.
- JS (section 9): uses Web Animations API (`element.animate()`). Ticket appears in In Progress, slides `translateX(148px)` into Done (136px board + 12px gap), fades out. Duration 950ms. On `mouseleave` the current flight completes naturally; next task is only queued if `isHovering`. Loops through 5 tasks indefinitely while hovered with 280ms pause between tasks.
- translateX(148px) = 136px (board width) + 12px (margin-left on second board). If board width or gap changes, update this value in script.js.

Why:
- User requested task cards visually moving from In Progress to Done on hover, completing current animation on mouse-out, looping 5 tasks if hovered long enough.

Context for future AI:
- The 5 task labels are in `BOARD_TASKS` array in script.js section 9. Edit there to change task names.
- `currentAnim.playState === "running"` guard prevents double-firing on rapid re-hover.
- The `fill: "none"` in the animate() options is intentional — the ticket returns to `opacity: 0` after each flight rather than staying frozen at the last keyframe.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`

Details:
- Fixed off-center circle: wrapped both `.process-panel` divs and `.process-connect` in a new `.process-panels-wrap` (inline-flex, position: relative). Circle's `left: 50%` now references the two-panel area only, not the full card width.
- Added scale(1.06) + translateX(3px) to panel transforms for a zoom-in effect. Math: scale grows each inner edge by 4.68px (9.36px total), translate 3px each adds 6px more = 15.36px total reduction on a 16px gap → ~0.64px remaining (close, not touching).
- Implemented separate forward/reverse transitions by overriding `transition` inside `.discovery-active`. Forward sequence: panels (0s) → green circle (0.15s) → inner circle (0.38s) → checkmark (0.65s). Reverse sequence (class removed): checkmark (0s) → inner circle (0.05s) → green circle (0.25s) → panels (0.45s). Both directions feel intentional and smooth.

Why:
- Circle was visually off-center (appeared overlapping the right panel). User also wanted scale zoom effect and a smooth reverse animation.

Context for future AI:
- `process-panels-wrap` must remain `display: inline-flex` — if changed to `flex` or `block`, it will stretch to card width and break centering again.
- The dual-transition approach (base state = reverse delays, `.discovery-active` = forward delays) is the only CSS-only way to have different timing in each direction. Do not flatten these to a single transition value.
- Panel scale math: scale(1.06) on 156px panel → inner edge extends 4.68px. With translateX(3px): total gap consumed = 9.36 + 6 = 15.36px from a 16px gap. If panels are resized, recalculate or they'll overlap.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`, `script.js`

Details:
- Replaced the ring-drawing animation with a layered circle + checkmark approach.
- HTML: swapped `.process-connect-ring` for `.process-connect-inner` (white circle) containing a `<svg class="process-connect-check">` with a `<polyline class="process-check-path">`.
- CSS: removed `@property --ring-progress` and conic-gradient ring entirely. Added `.process-connect-inner` (scales in at 0.38s delay) and `.process-check-path` stroke-dasharray draw animation (0.65s delay, 0.45s duration).
- Sequence: panels slide (0s) → green circle (0.15s) → white inner circle (0.38s) → checkmark draws (0.65s). Total ~1.1s.
- Updated `ANIM_DURATION` in script.js from 1100ms → 1200ms to give the checkmark a clean finish.

Why:
- User wanted a white inner circle with an animated checkmark inside the green circle, not a ring drawing around it.

Context for future AI:
- `stroke-dasharray: 28` on `.process-check-path` matches the approximate path length of the checkmark polyline `4,11 8,15 16,6` in a 20×20 viewbox. If the checkmark shape changes, re-measure the path length and update this value or the draw will clip or overshoot.
- `ANIM_DURATION` in script.js (section 8) must stay in sync with the slowest CSS transition: currently checkmark at 0.65s + 0.45s = 1.1s → constant is 1200ms.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`, `script.js`

Details:
- Fixed two bugs from the previous animation implementation:
  1. `.process-panel:last-child` was targeting `.process-connect` (the circle div), not the second panel — only the first panel was sliding. Fixed by switching to `nth-child(1)` and `nth-child(2)`.
  2. CSS `:hover` transitions reversed immediately on mouse-out mid-animation. Replaced all `:hover` selectors with a `.discovery-active` class.
- Added section 8 in `script.js`: on `mouseenter`, adds `.discovery-active` to the discovery card; on `mouseleave`, waits 1100ms (full animation cycle) before removing it. `clearTimeout` on re-enter so rapid hover-in/out doesn't glitch.
- Total animation cycle: panels slide (0.5s, no delay) → circle scales in (0.4s, 0.15s delay) → ring draws (0.7s, 0.35s delay) = ~1.1s.

Why:
- User reported both panels weren't sliding and the animation didn't complete when hovering briefly.

Context for future AI:
- All discovery card animation state is controlled by `.discovery-active` class — do not revert to `:hover` CSS selectors.
- ANIM_DURATION in script.js must match the total CSS animation time (delay + duration of the slowest element). Currently ring: 0.35s + 0.7s = 1.05s → constant is 1100ms.
- `.process-connect` is the last child of `.process-visual-people` in the DOM, so panel selectors must use `nth-child(1)` and `nth-child(2)`, not `first-child`/`last-child`.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/process.css`

Details:
- Added hover animation to the Discovery Session card (card 01).
- Added `.process-connect` div (with inner `.process-connect-ring`) as the last child of `.process-visual-people` in `index.html`.
- On card hover: the two `.process-panel` elements translate inward by 20px each (toward center), a green circle (`.process-connect`) scales in from 0 → 1 at center via `position: absolute`, and an inner black ring (`.process-connect-ring`) draws itself using `conic-gradient` + `mask` animated via `@property --ring-progress` from 0deg → 360deg.
- `.process-connect` uses `position: absolute` so it doesn't affect the flex layout of the two panels.
- `.process-visual-people` updated: added `position: relative` (needed for absolute child) and `align-items: center` (overrides `flex-start` from `.process-visual` to vertically center panels with the circle).

Why:
- User requested a hover animation on the Discovery Session card where panels move together, a green circle appears in the middle, and a black ring draws a complete circle.

Context for future AI:
- `@property --ring-progress` is required for the conic-gradient animation to interpolate smoothly — do not remove it.
- The `.process-connect` must remain `position: absolute` or it will push the two panels apart in the flex layout.
- Transition delays are staggered: green circle appears at 0.15s delay, ring draws at 0.35s delay — this creates the sequence: panels move → circle pops → ring draws.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`

Details:
- Increased `.process-header` max-width from `860px` to `1100px` to reduce the left/right margins around the title.

Why:
- User wanted less horizontal margin on the process section title.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`

Details:
- Reduced `.process-header .process-title` font-size from `clamp(40px, 6vw, 92px)` to `clamp(32px, 4vw, 56px)`.

Why:
- User requested a smaller process section title.

Context for future AI:
- This selector is scoped to `.process-header .process-title` intentionally — do not simplify back to `.process-title` or it will lose to `.section h3` in `global.css`. See logs entry from 2026-04-09 for full explanation.

---

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `index.html`, `styles/global.css`

Details:
- Audited `index.html` for all inline CSS. Found 5 identical `style="text-align: center; margin-top: 20px; color: #666"` attributes on placeholder `<p>` tags in the Services, About, Showcase, Feedback, and Pricing sections.
- Extracted the shared style into a new `.section-placeholder` utility class in `styles/global.css`.
- Replaced all 5 inline `style=""` attributes with `class="section-placeholder"`.
- No `<style>` blocks were present in `index.html`.

Why:
- User requested that no CSS live inside `index.html` — all styling must be in dedicated CSS files.

Context for future AI:
- `index.html` is now free of all inline styles. Keep it that way — never add `style=""` attributes or `<style>` blocks to `index.html`.
- `.section-placeholder` in `global.css` is a shared utility for the 5 placeholder sections (Services, About, Showcase, Feedback, Pricing). Remove it from `global.css` once those sections are built out and the placeholder `<p>` tags are replaced.

---

## 2026-04-11 19:42:04 PKT
Author: Codex
Files changed: `README.md`, `logs.md`

Details:
- Added a stronger workflow rule requiring future editors to review the last 5 `logs.md` entries before making any new change.
- Reinforced that each new change must be logged with date, author, files changed, details, why, and context for future AI.

Why:
- The user wanted a consistent handoff workflow so new edits always start with recent context and are documented clearly for the next AI.

Context for future AI:
- Treat this workflow as the project-level memory mechanism.
- Working order:
  1. Read `README.md`
  2. Read `logs.md`
  3. Review the last 5 log entries
  4. Make the change
  5. Append a structured log entry

## 2026-04-09 (session)
Author: Claude Sonnet 4.6
Files changed: `styles/process.css`, `README.md`, `logs.md`

Details:
- Diagnosed `.process-title` font-size changes having no effect.
- Found two bugs: (1) broken `clamp(406px, 60vw, 92px)` — min and max were swapped, corrected to `clamp(40px, 6vw, 92px)`; (2) `.section h3` in `global.css` has specificity `0,1,1` which always beat `.process-title` at `0,1,0`, locking the title to `clamp(32px, 5vw, 48px)` regardless of what was set.
- Fixed by scoping both the main rule and the `@media (max-width: 520px)` override to `.process-header .process-title` (specificity `0,2,0`).
- Documented the specificity trap in `README.md` under "Known Architecture Gotchas" so future editors don't hit the same wall.
- Established the `logs.md` + `README.md` read-first, log-after protocol in persistent memory.

Why:
- User reported the Process section title font-size would not change no matter what value was set.

Context for future AI:
- Every section in `index.html` uses both a section-specific class AND the shared `section` class (e.g. `class="process-section section"`). This means `.section h3` in `global.css` will match any `h3` inside any section. Always scope section title selectors to their parent container to win the specificity battle.
- Template for all future log entries: date + time (PKT), Author: Claude Sonnet 4.6, files changed, details, why, context for future AI.

---

## 2026-04-11 19:37:10 PKT
Author: Codex
Files changed: `README.md`, `logs.md`

Details:
- Created `logs.md` as the dedicated project history file.
- Moved the change history out of `README.md` into this file so future AI editors have one place to review past edits.
- Standardized the logging expectation: include timestamp, author, changed files, change summary, rationale, and important gotchas.

Context for future AI:
- `README.md` should still be read first for architecture notes and editing rules.
- `logs.md` is now the place to append future implementation history.

## 2026-04-11 19:34:54 PKT
Author: Codex
Files changed: `README.md`

Details:
- Added explicit workflow guidance telling future AI editors to read `README.md` before making changes.
- Required future change-log entries to include timestamps, changed files, rationale, and gotchas for the next editor.

Context for future AI:
- This guidance is now also reflected in `logs.md`, which should be used for future history instead of `README.md`.

## 2026-04-11 19:23:12 PKT
Author: Codex
Files changed: `styles/process.css`, `README.md`

Details:
- Matched the Process section title size to the Comparison section title scale.
- Corrected a regression where the Process title had become too small.

Why:
- The user wanted the Process title to visually match the Comparison section heading.

Context for future AI:
- Process title sizing is sensitive because `.section h3` in `global.css` can override less-specific selectors.

## 2026-04-11 19:15:54 PKT
Author: Codex
Files changed: `styles/process.css`, `README.md`

Details:
- Increased the Process title size.
- Reduced the Process subtitle size slightly.
- Added more vertical space between the Comparison section and the Process section.

Why:
- The user wanted stronger visual hierarchy and more breathing room before the Process section.

## 2026-04-11 18:56:44 PKT
Author: Codex
Files changed: `index.html`, `styles/process.css`, `README.md`

Details:
- Replaced the placeholder `#process` section with a real four-card Process layout.
- Linked `styles/process.css` in the document head.
- Added responsive Process section styling with desktop two-column layout and mobile single-column stacking.

Why:
- The user provided a Tailwind-based Process section example and asked for it to be integrated using this project’s own HTML/CSS architecture.

Context for future AI:
- Do not bring Tailwind into the project for this section.
- Continue using semantic HTML in `index.html` and section-specific CSS in `styles/process.css`.

## 2026-04-09 23:44:09 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Locked the mobile comparison column headers to bottom-left alignment.
- Tightened header line-height so the larger text sits more cleanly.

Why:
- The user wanted the mobile comparison headers aligned bottom-left.

## 2026-04-09 23:42:04 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Increased the mobile comparison header font size.
- Widened the sticky grey first column.

Why:
- The user wanted the three mobile comparison headers to be larger and the first grey column to have more width.

## 2026-04-09 23:40:21 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Removed the bottom rounded corners from the sticky grey first column in the mobile comparison table.

Why:
- The user requested a straight bottom edge on the first grey column.

## 2026-04-09 23:37:20 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Centered the mobile comparison column content visually.
- Extended the sticky grey first column farther downward at the bottom.

Why:
- The user wanted the three columns visually centered against the grey column and wanted the grey column taller from the bottom.

## 2026-04-09 23:21:58 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Made all mobile comparison columns the same width.
- Extended the sticky grey first column from the top and bottom.
- Increased the grey column corner radius.

Why:
- The user wanted the mobile table columns to share one width and wanted the first grey column to feel taller and more prominent.

## 2026-04-09 23:10:00 PKT
Author: Codex
Files changed: `styles/comparison.css`, `README.md`

Details:
- Reworked the mobile comparison table so the sticky left label column stays visible.
- Sized the viewport to favor the first comparison column at initial view.
- Increased mobile text size.
- Smoothed horizontal scrolling behavior.
- Extended the left column at the bottom for stronger visual anchoring.

Why:
- The user wanted only the first grey column and first comparison column visible initially on mobile, with larger text and smoother horizontal comparison.

## 2026-04-09 (session)
Author: Claude
Files changed: `styles/process.css`, `README.md`

Details:
- Diagnosed why Process title font-size edits appeared to do nothing.
- Found two root issues:
  - `global.css` rule `.section h3` had higher specificity than `.process-title`
  - A broken `clamp()` had min and max values swapped in an earlier edit
- Fixed the title rule by raising specificity to `.process-header .process-title` and correcting the `clamp()` value.
- Applied the same specificity-aware pattern to the mobile override.

Why:
- The Process section title was not responding to font-size changes.

Context for future AI:
- Any section title using `h3` inside `.section` can be affected by the same specificity trap.
