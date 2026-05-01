# Project Context

Date: 2026-04-30
Assistant: Codex

## Current Project

This is the Clockwrk landing page project in `/Users/mustafakhetran/clockwrk`.

The project is a static site using:

- `index.html`
- `script.js`
- CSS files inside `styles/`
- Assets inside `assets/`

The user prefers direct implementation and short, factual updates. The user previously requested that `read.md` and `logs.md` no longer be updated, so those files should not be used as change logs unless explicitly requested again.

## General Working Rules

- Do not revert unrelated user changes.
- Use `apply_patch` for file edits.
- Keep desktop and mobile behavior separate when the user asks for mobile-only changes.
- Preserve existing animations unless the task specifically asks to change them.
- Keep GitHub updates explicit and intentional.
- The user often provides screenshots as visual references and expects close visual matching.

## Services Section

The services section is a black shell with a service table on the left and a drag/drop or compare area on the right for desktop. Mobile has a separate interaction model.

Important current files:

- `index.html`: services markup starts around the services section.
- `styles/services.css`: all major services styling.
- `script.js`: service table interaction, service selection, mobile compare popup, calculator logic.

Current categories and counts:

- Development: 11
- Design: 9
- Branding: 6
- Presence: 8
- Outdoor & Print / Outdoor & Other: 5

The latest requested service list is:

Development:

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

Design:

- MVP
- Website
- Landing Page
- E-commerce
- Mobile App
- SaaS
- Browser Extension
- Custom UI
- Custom UX

Branding:

- Logo
- Branding
- Design System
- Illustrations
- Mockups
- Icons

Presence:

- Pitch Deck
- Slide Deck
- Digital Ads
- Email Graphics
- Infographics
- SMM Graphics
- Brochures
- Business Cards

Outdoor & Other:

- Packaging
- Stationery
- Billboards
- Trade Show Banners
- Resumes

Each service should have:

- Service label
- Tooltip description
- Minimum hours

The tooltip design should match the black rounded tooltip screenshot:

- Large centered white description
- Smaller grey text: `It's an example. Services tailored to each client's needs.`
- Tooltip should sit above the service pill and stay in front of other text.

Recent service spacing change:

- `.services-request-list` in `styles/services.css` was updated to:
  - `gap: 24px`
  - `padding: 0 0 2px 18px`

This adds left padding and vertical spacing between service pills.

## Services Calculator Logic

Requested calculator logic:

```js
selected_hours = sum of all chosen service minimum hours
buffered_hours = selected_hours * 1.2
weeks_startup = (buffered_hours / 8) / 5
weeks_business = weeks_startup / 2
weeks_enterprise = weeks_startup / 3
```

Display format:

```text
Those X services can be provided on a:
Startup plan     -> ~N mo. of subscription
Business plan    -> ~N mo. of subscription
Enterprise plan  -> ~N mo. of subscription
```

Rules:

- Round month estimates up to nearest `0.5`.
- If result is less than `1` month, show `~1 mo.` minimum or weekly option.
- Startup means 1 request at a time.
- Business means 2x faster.
- Enterprise means 3x faster.
- If chosen plan weeks are `<= 1`, suggest weekly.
- If chosen plan weeks are `> 1`, suggest monthly price times number of months.

## Mobile Services Compare Popup

The mobile services compare popup:

- Appears when the user reaches the service-section trigger threshold.
- Slides up from the bottom.
- Tracks with scroll until it reaches the end of the service table.
- Then docks at the end of the service table.
- Slides back down when scrolling above the trigger threshold.
- Should not reappear after the user scrolls past the services section.
- Highest z-index except navbar.
- Separate from the services section visually and logically.

The popup contains:

- Glass morphism prompt row.
- Compare plans section.
- Tools and tech section pinned below compare plans.

## Services Mobile UI

Mobile service tabs are horizontally scrollable.

Mobile service title pills:

- Show selected counter inside the active pill.
- Counter should be small and centered.
- Selecting subservices should not resize the entire service table.

Mobile subservice pills:

- Plus button is a custom animated CSS icon.
- Plus rotates into minus when selected.
- Selected pill greys out.
- Only mobile behavior should be independent of desktop behavior.

## Process Section

The process section has animated cards:

- Discovery session
- Start engagement
- Get steady updates
- Get started CTA

Important behavior:

- Mobile animations trigger when cards enter the viewport.
- Desktop hover animations should still work.
- Start engagement animation:
  - Progress tab has two non-active cards.
  - Done tab has one active card.
  - Bottom non-active card becomes active and flies to done tab.
  - Existing done card fades out before flying card arrives.
  - Flying card should settle without snapping.
  - Top card slides down.
  - New top card fades/slides in from the left.

## CTA Buttons

Landing page CTA hover logic:

- On hover, black CTA changes to lime.
- Text changes color.
- "now" appears and animates.
- Arrow circle follows the mouse on desktop.

This hover logic was also applied or referenced for:

- Compare plans button
- Book a quick call button

Mobile CTA buttons:

- Two Get Started buttons and one Book a Quick Call button should have the same full-width style.
- Compare Plans button is excluded from that rule.
- Mobile CTA buttons should be full available width and slightly slimmer height-wise.

## Quick Call Section

A quick-call section was added between Services and About.

Content:

```text
Something is missing,
or just aren't sure what fits best?
Book a quick session
```

Important styling:

- Desktop keeps the second line in one straight line.
- `fits best` is lime.
- Mobile title should be bigger, bolder, and narrower to match screenshot.
- Book link should have lighter font weight and slightly smaller font on mobile.
- Thinking-face emojis animate in when the section enters view:
  - Slide up from below.
  - Stay for about 2 seconds.
  - Fly higher and fade out.
  - Do not show again until page reload.
  - They should sit in front of text.

## About Section

The about section includes a black rounded box.

Current about hero concept:

- Glass-style icons, not people photos.
- Icons use white/glass background.
- Main title: `Real people with top skills`
- User later wanted smaller title and smaller subtitle width.
- Subtitle:

```text
Our expertise comes from shipping real products for real businesses. We bring strategy, design, development, integrations, and support together so every project moves with one focused software team.
```

The logo card was removed from the about section.

Mobile about:

- Black box is reduced in height.
- Icons and circles increased slightly.
- Spacing should match the people screenshot, but keep the current icon style.

About strength cards:

- Added under about hero.
- Desktop: cards in a row, black rectangles, hover animation with floating emojis/icons.
- Mobile: cards are stacked in a column.
- Mobile has a star button at top right.
- Tapping card activates hover animation.
- Only one card can be active at once.
- Active star circle turns green.
- Card loses focus when tapping outside or scrolling.

## Trust Section

Trust section is part of About.

Desktop:

- Full height light-grey section.
- Left side has title, subtitle, and Book a quick call button.
- Right side has scroll-triggered cards.
- Cards float from below and stack using z-index.
- Cards should come up in a straight line, with equal width and equal spacing.

Trust title:

```text
Why 100+ clients trust Clockwrk?
```

Subtitle:

```text
Working with Clockwrk gives you the experience of a focused digital team: strategy, design, development, integrations, and support moving together under one clear process
```

Cards:

- Card 1 is hardcoded.
- Cards 2, 3, and 5 use SVG assets from `assets/misc`.
- Card 4 uses `assets/misc/card 4.svg`.
- Card 5 uses `assets/misc/card5.svg`.

Mobile:

- Title and subtitle centered.
- Paragraph justified when requested.
- Cards are a horizontal slider similar to the services plan slider.
- Button full width below cards.
- Mobile card shadows removed to avoid clipping.
- Trust section previously had horizontal overflow; check if it returns.

## Showcase Section

Showcase section starts after trust section.

Header:

```text
Some of our recent work
```

`recent` is lime.

Trust line was restored:

```text
Trusted by startups from Y Combinator techstars
```

Mobile:

- Reduce top padding between trust and showcase title.
- Reduce font size for `Y Combinator` and `techstars`.
- Showcase tiles activate based on user scroll.

Showcase layout:

- Two columns.
- Left column has 4 square-ish cards.
- Right column has 3 originally, then reduced to 6 total cards.
- Right column starts lower than left.
- All tiles same width.
- Tile heights were reduced.
- Rounded edges on all cards.
- Hover shows title/subtitle/service pills/counter.
- Title slides from top.
- Counter slides from right.
- Service pills slide from left.
- Popover above counter may overflow outside card.

Current showcase entries include:

- Pak Carriage / likely PCC
- Ferox / Industrial Company / Website, UIUX, another service / counter 5
- Rift / Fitness tracker app / Mobile App, UIUX, Backend / counter 8
- Lagom Studio / Architectural Studio / Branding, Website, Logo / counter 2
- Kanzo / Clothing Brand / Branding, Website, another service / counter 3
- Ziafat / Clothing Brand / Branding, Website, another service / counter 3
- Elythea / Maternal healthcare brand / Logo, Website, UI System / counter 3

User specifically requested:

- Replace Rawayat with Ferox and use the Ferox mockup.
- Replace Codefish with Rift and use the fitness tracker image.
- Remove M94 and add Elythea.
- All showcase titles aligned left.
- All title/subtitle text white/grey and smaller.
- Sarwar Poly replaced by Codefish earlier, then Codefish replaced by Rift.

## Pricing Section

Pricing section is black and same width as services section.

Main title:

```text
Strong team of A-tier specialists
```

Subtitle:

```text
with rich skill sets for the salary of one
```

Plan area:

- Left: plan selection box.
- Right: contains plan contents and mobile/desktop summary.
- User said not to include the client slot square.
- Each plan contains section should extend up.

Billing toggle:

- Options are Weekly and Monthly.
- White pill slides between options.
- Discount pill `-15%` is shown.

Plan cards:

- Startup
- Business
- Enterprise

Plan card row terminology:

- `active_dot row`: top row with small active dot at the end.
- `plan row`: plan title and request details.
- `price row`: price pill.

Plan card changes:

- Active dot smaller with slight grey outline.
- Plan row moved slightly lower.
- Plan cards made shorter.
- Reduced line height between plan title and subtitle.
- Price pill moved left.
- Price font increased.
- Plan cards should be slightly wider.
- Hover should only change colors, not resize or remove the pill.

Prices requested:

Weekly:

- Startup: `$870`
- Business: `$1,550`
- Enterprise: `$2,300`

Monthly:

- Startup: `$2,958`
- Business: `$5,270`
- Enterprise: `$7,820`

PKR and savings info exist in screenshot but exact implementation should be checked in current code.

Plan card hover:

- No resizing.
- Price pill stays visible.
- Colors change only.

Pricing add-ons:

- Title: `Add some magic`
- Add-on entries:
  - `Webflow or Framer development` / `+ $990`
  - `Custom frontend / backend development` / `+ $1990`

Desktop:

- Pricing plan pills and addon price pills should have same font size and width.
- Addon desktop font size was accidentally increased before and then corrected.

Mobile:

- Plan section is separate from addon section.
- Grey box containing plans should end with rounded borders.
- Enterprise card should have padding at its end only.
- Add some magic should sit centered between plan section and addon section.
- Addon section height reduced.
- Addon title font slightly increased.
- Addon price pills match pricing plan pills.
- Addon plus sign alignment fixed.

Pricing summary popup:

- Same mobile popup logic as services compare popup.
- Triggers at 60% of pricing section.
- Sticks to the end of the pricing section as the user scrolls past.
- Goes away when user scrolls above trigger point.
- Rounded borders top and bottom after docking.
- Center pricing in summary popup.
- Reduce pill button height a little.

Summary expanded state:

- Opens when user presses `Learn more`.
- If user is past the pricing section even slightly, scroll up so pricing section end is slightly above end of screen, then expand.
- Expansion should be smooth.
- Total slides left.
- Close button slides in from right.
- Learn more text slides down off screen.
- CTA button slides down and is thinner.
- Expansion was too fast, so it was slowed.
- If summary expands at limit and closes, it should not slide completely off-screen.

Expanded popup rows:

- Price row
- Divider row
- Benefits/checklist row
- Explanation row
- CTA row

Expanded popup target style:

- Lime background.
- White circular close button.
- Large price and `Total`.
- Thin divider.
- Checklist with checkmarks.
- Paragraph explanation.
- Proceed CTA button near bottom.

Mobile pricing benefits:

Texts:

- `No hiring fee`
- `We're ready to get started right now - no waiting, no delays`
- `No interviews`
- `Forget the endless search for the best. We're already here.`
- `No extra hassle`
- `Get near in-house experience without having to think of benefits when hiring employees`

Mobile needs:

- Add top padding before benefits.
- Increase subtitle font size.
- Add padding between benefit titles and subtitles.
- Same top/bottom padding between addon section and summary section.

## Navbar

Desktop nav order was changed:

- Pricing and Feedback switched.

Mobile nav drawer:

- Was jittery.
- Desired behavior:
  - White background fades in.
  - Navbar stays in front with higher z-index.
  - Nav links slide down from top and settle smoothly.
  - When closing, nav links slide out first, then background fades.
  - Top section above navbar should not turn white after fade completes unexpectedly.

Navbar updates were pushed earlier.

Navbar should have highest z-index.

## Recent Git / Branch Context

User previously asked to:

- Push updates to GitHub.
- Create and merge branches.

Approved command prefixes include:

- `git add`
- `git commit`
- `git add -A`
- `git checkout -b`
- `git push origin`

Do not run destructive git commands unless explicitly requested.

## Immediate Last Change

The latest actual code change before this context file:

File: `styles/services.css`

Change:

```css
.services-request-list {
  gap: 24px;
  padding: 0 0 2px 18px;
}
```

Purpose:

- Add left padding to services.
- Add more vertical spacing between services.
