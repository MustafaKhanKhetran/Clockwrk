# Project Context - 2026-04-30

## Working Context

- Project root: `/Users/mustafakhetran/Clockwrk`
- Main files: `index.html`, `script.js`, `styles/*.css`, `assets/*`
- Current site is a static landing page for Clockwrk, a digital agency.
- Do not update `README.md`, `read.md`, or `logs.md` unless explicitly requested.
- Preserve existing desktop behavior when making mobile-only fixes.
- Use `apply_patch` for manual edits.
- Do not revert unrelated changes.

## Communication Preferences

- Be direct, factual, and implementation-focused.
- Avoid long explanations unless asked.
- If making code changes, inspect relevant files first.
- When pushing to GitHub, check `git status --short` first and commit intentionally.

## Recent Change

The most recent requested UI change was to add spacing inside the services list:

- Updated `styles/services.css`.
- `.services-request-list` now has more vertical spacing between service pills.
- `.services-request-list` now has left padding so service labels are not flush against the drawer edge.

Current relevant rule:

```css
.services-request-list {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: auto;
  gap: 24px;
  padding: 0 0 2px 18px;
}
```

## Services Section

The services section includes:

- Service title tabs/categories.
- Sub-service pills.
- Desktop drag/drop request area.
- Mobile service picker.
- Compare plans popup.
- Tools and tech section.

The latest service categories should be:

### Development

- Web Application
- SaaS Platform
- E-commerce
- Mobile App
- MVP Build
- API & Integrations
- Browser Extension
- Backend & Database
- DevOps & Deployment
- CMS Setup
- Bug Fixes

### Design

- MVP
- Website
- Landing Page
- E-commerce
- Mobile App
- SaaS
- Browser Extension
- Custom UI
- Custom UX

### Branding

- Logo
- Branding
- Design System
- Illustrations
- Mockups
- Icons

### Presence

- Pitch Deck
- Slide Deck
- Digital Ads
- Email Graphics
- Infographics
- SMM Graphics
- Brochures
- Business Cards

### Outdoor & Other

- Packaging
- Stationery
- Billboards
- Trade Show Banners
- Resumes

## Service Tooltip Requirements

Each service should have:

- A hover tooltip.
- A minimum-hour value.
- Tooltip format: service description, then a grey supporting line.
- Supporting line text:

```text
It's an example. Services tailored to each client's needs.
```

The tooltip should be black, rounded, above the pill, and must not be clipped by parent containers.

## Calculator Logic

The service calculator should use hours, not raw service count.

```js
selected_hours = sum of all chosen service minimum hours;
buffered_hours = selected_hours * 1.2;
weeks_startup = (buffered_hours / 8) / 5;
weeks_business = weeks_startup / 2;
weeks_enterprise = weeks_startup / 3;
```

Rules:

- Startup = 1 request at a time.
- Business = 2x faster.
- Enterprise = 3x faster.
- If chosen plan duration is `<= 1` week, show weekly pricing.
- If chosen plan duration is `> 1` week, show monthly pricing times estimated months.
- Round month estimates up to nearest `0.5`.
- Minimum display is `~1 mo.` if the estimate is under 1 month.
- Display copy:

```text
Those X services can be provided on a:
Startup plan     -> ~N mo. of subscription
Business plan    -> ~N mo. of subscription
Enterprise plan  -> ~N mo. of subscription
```

## Pricing Section

The pricing section has:

- Main black pricing shell.
- Plan cards.
- Weekly/monthly slider.
- Add-ons section.
- Benefits text.
- Mobile summary popup.

Current pricing values:

- Startup weekly: `$870`
- Startup monthly: `$2,958`
- Business weekly: `$1,550`
- Business monthly: `$5,270`
- Enterprise weekly: `$2,300`
- Enterprise monthly: `$7,820`

Pricing behavior:

- Weekly/monthly selector should slide the white active pill between options.
- Plan cards should select on tap/click.
- Hover should change colors only, with no resizing.
- Price pills in plan cards and add-ons should match size and font sizing on desktop.

Mobile pricing summary behavior:

- Popup appears at 60% of the pricing section.
- It follows the user until it docks at the end of the pricing section.
- It disappears when the user scrolls above the trigger point.
- It should not reappear after the user has scrolled past the pricing section.
- Learn-more expands the popup smoothly.
- If user is slightly past pricing end when expanding, scroll up slightly above the pricing section end before expansion.
- Closing at the docking limit must not slide the summary fully off screen.

Expanded summary popup rows:

- Price row.
- Feature list row.
- Description row.
- CTA row.

Expansion animation requirements:

- Total label slides left.
- Close button slides in from the right.
- Learn-more text slides down out of view.
- CTA button slides down.
- Expansion should be slow and smooth.
- CTA button should be thinner on mobile.

## Showcase Section

Showcase title:

```text
Some of our recent work
```

`recent` is lime green.

Trust line should remain under the title:

```text
Trusted by startups from Y Combinator techstars_
```

Showcase layout:

- 6 showcase tiles.
- Two columns.
- Right column starts slightly lower.
- Tiles have rounded edges.
- Tiles use a single image each.
- Hover reveals title, subtitle, service pills, and subscription counter.
- Hover content should animate:
  - Title slides from top.
  - Counter slides from right.
  - Service pills slide from left.
- Titles/subtitles should be small, left-aligned, white/grey.

Known showcase items:

- Pak Carriage.
- Ferox, Industrial Company, counter `5`, pills: Website, UI/UX, another service.
- Rift, fitness tracker app, counter `8`, pills: Mobile App, UI/UX, Backend.
- Lagom Studio, Architectural Studio, counter `2`, pills: Branding, Website, Logo.
- Kanzo, Clothing Brand, counter `3`, pills include Branding and Website.
- Elythea, maternal healthcare brand, counter `3`, pills: Logo, Website, UI System.

Codefish was removed and replaced by Rift.
M94 was removed and replaced by Elythea.
Rawayat was replaced by Ferox.

Mobile showcase behavior:

- Showcase tiles activate based on scroll position.
- Top padding between trust section and showcase title should be reduced on mobile.
- Y Combinator / Techstars trust line should have smaller font on mobile.

## Quick Call Section

Placed between Services and About.

Main text:

```text
Something is missing, or just aren’t sure what fits best?
```

`fits best` is lime green.

CTA text:

```text
Book a quick session
```

Requirements:

- Desktop second line should stay on one line where possible.
- Mobile text should be larger/bolder but narrower.
- CTA text should be lighter and slightly smaller.
- Emoji elements slide up as the user scrolls into the section.
- Emojis stay for about 2 seconds, then fly higher and fade.
- Emojis should only show once per page load.
- Emojis should appear in front of the text.

## About Section

About section includes:

- Black rounded content box.
- Glass-style circular icons.
- No logo card.
- Title:

```text
Real people with top skills
```

Current subtitle:

```text
Our expertise comes from shipping real products for real businesses. We bring strategy, design, development, integrations, and support together so every project moves with one focused software team.
```

About notes:

- Icons use white/glass circular backgrounds.
- Subtitle width should stay controlled.
- Mobile black box should be shorter, with larger icon circles.

## About Agency Cards

Cards under the about intro:

- Desktop: 3 horizontal rectangles.
- Mobile: column layout.
- Text is left-aligned.
- Titles are max 2 words.
- Each mobile card has a star button in the top right.
- On mobile, tapping a card activates it.
- Only one card active at a time.
- Active star circle turns green.
- Card loses focus if user taps outside or scrolls.

## Trust Section

Trust section has:

- Large grey/white section.
- Left copy and CTA.
- Right card stack on desktop.
- Horizontal card slider on mobile.

Trust heading copy:

```text
Why 100+ clients trust Clockwrk?
```

Trust paragraph:

```text
Working with Clockwrk gives you the experience of a focused digital team: strategy, design, development, integrations, and support moving together under one clear process
```

CTA:

```text
Book a quick call
```

Notes:

- CTA uses same hover logic as landing page CTA.
- Mobile title/subtitle are centered.
- Mobile button is full width.
- Mobile card shadows were removed to prevent clipping.
- Trust cards use SVG assets from `assets/misc` for card 2, card 3, card 4, and card 5.
- Card 1 is the only card intended to remain hardcoded.

## Process Section

Process section has 4 cards:

- Discovery session.
- Start engagement.
- Get steady updates.
- Get started CTA.

Important animation behavior:

- Start engagement card has progress/done tabs.
- There are always 2 inactive task cards in progress and 1 active card in done.
- Bottom inactive progress card becomes active and flies into done.
- Existing done card fades out before flying card settles.
- Flying card should settle without snapping.
- Top inactive card slides down.
- Replacement inactive card fades/slides in from left.
- Animation should be smooth and continuous.

Discovery animation:

- Rewinds about 500ms after completion.

Get steady updates:

- Stacked website pages animate.
- Top page fades out and next page comes forward.
- Desktop hover and mobile in-view triggers both matter.

## CTA Buttons

Mobile CTA buttons should be consistent:

- Two `Get started` buttons.
- One `Book a quick call` button.
- All full available width.
- Slightly slimmer height.
- Compare plans button is excluded from this shared sizing rule.

Landing CTA hover behavior:

- On hover, card turns lime.
- Text changes and slides.
- Arrow circle tracks mouse on desktop.
- `now` text appears smoothly.

## Navbar

Mobile nav drawer:

- White background fades in.
- Navbar stays in front with highest z-index.
- Links slide down from top and settle.
- Closing: links slide out first, then background fades.
- Top strip above navbar should not abruptly turn white after fade.

## Git/GitHub Notes

Previously used branches:

- `fixing mobile ui for services`
- `fixinf compare plan popup`

Approved Git command prefixes include:

- `git add`
- `git add -A`
- `git commit`
- `git checkout -b`
- `git push origin`

Before any GitHub push or commit:

```sh
git status --short
```

Do not force reset or revert user work unless explicitly requested.
