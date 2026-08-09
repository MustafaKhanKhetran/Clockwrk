# Clockwrk Context

Last updated: 2026-05-19  
Maintainer context: Codex

## Read First

- Always read this file before making any code/content changes.
- Project root: `/Users/mustafakhetran/clockwrk`
- Static vanilla site: `index.html`, page HTML files, `script.js`, `styles/*.css`, `assets/*`.
- Do not update `README.md`, `read.md`, or `logs.md` unless explicitly requested.
- Use `apply_patch` for manual edits. Do not revert unrelated user changes.
- Keep desktop and mobile behavior separate when a request is mobile-only.
- Preserve existing animations unless the task explicitly changes them.
- User expects close screenshot matching and concise implementation-focused updates.
- Before any commit/push, run `git status --short`.

## Git / Workspace

- The worktree is often dirty. Treat existing changes as user/project work unless they are clearly part of the current task.
- Approved git prefixes have included `git add`, `git add -A`, `git commit`, `git checkout -b`, and `git push origin`.
- Do not run destructive git commands unless explicitly requested.

## Design System

- Brand: Clockwrk.
- Primary lime is the site accent; use existing CSS variables where available instead of hardcoding new greens.
- Primary black sections use soft rounded corners and restrained spacing.
- CTA hover pattern: swap black/lime/white states, slide text/icon where existing components already do this.
- Footer logo uses text in Orbitron, not a logo image.
- Prefer matching existing section patterns over inventing a new visual language.

## Main Navigation / Footer

- Desktop navbar has expanded-only links for `Referral` and `Careers`; collapsed nav links must stay centered and not shift right.
- Mobile menu also includes Referral and Careers.
- Footer social/link column order should be: `Careers`, `Referrals`, `X`, `Linkedin`.
- Footer mailbox arrow hover: icon circle turns lime and arrow/icon turns black.
- Back-to-top/footer CTA follows the trust-card/quick-call button style where applicable.
- Footer background is `#1d1d1d`.

## Services

The services section is a black shell with desktop service table, desktop drag/drop/request area, mobile picker, compare popup, and tools/tech.

Current categories:

- Development: Web App, Website, SaaS, E-commerce, Mobile App, MVP, API & Integrations, Extension, Backend & DB, DevOps, CMS, Bug Fixes.
- Design: MVP, Website, Landing Page, E-commerce, Mobile App, SaaS, Extension, UI Design, UX Design.
- Branding: Logo, Brand Identity, Design System, Illustrations, Mockups, Icon Set.
- Presence: Pitch Deck, Slide Deck, Ad Creatives, Email Templates, Infographic, Social Graphics, Brochure, Business Card.
- Outdoor & Print: Packaging, Stationery, Billboard, Event Banner, Resume.

Each service needs label, tooltip description, and minimum hours. Tooltip design: black rounded panel above the pill, large centered white description, grey support line `It's an example. Services tailored to each client's needs.`, and no clipping by parent containers.

Calculator logic uses hours:

```js
selected_hours = sum of selected service minimum hours;
buffered_hours = selected_hours * 1.2;
weeks_startup = (buffered_hours / 8) / 5;
weeks_business = weeks_startup / 2;
weeks_enterprise = weeks_startup / 3;
```

Startup is one request at a time, Business is 2x faster, Enterprise is 3x faster. Show weekly pricing when duration is `<= 1` week; otherwise show monthly subscription duration. Always round time up, never down.

Mobile services use separate plus/minus pill logic. Do not let mobile category changes resize/snatch the table abruptly; keep expansion/retraction smooth.

## Pricing

Plan prices:

- Startup: weekly `$870`, monthly `$2,958`
- Business: weekly `$1,550`, monthly `$5,270`
- Enterprise: weekly `$2,300`, monthly `$7,820`

Pricing section includes `Add some magic`; current add-on is `White Label Delivery`. Tooltip copy: `Your name on every file, every report, every document. Your clients never know we exist.` Previous custom frontend/backend add-on was removed.

Mobile pricing summary popup triggers around 60% of the pricing section, follows until docking, expands smoothly, and should not slide fully off screen when closing at the docking limit.

## Feedback

Desktop feedback has a horizontal card track, dashed connectors, seven cards, then a final black client-feedback screen. The final screen includes a white curtain reveal on desktop only. The horizontal controller should end when the full final client screen is in view before curtain scrolling begins.

Final desktop client screen:

- Black box width must not exceed pricing box width.
- Title: `Clockwrk - a digital agency that delivers`, with `Clockwrk` lime.
- Active avatar is larger with thin lime timer ring; inactive avatars are smaller and greyed out.
- Feedback text, name, and role switch with a smooth fade and no jitter.
- Role formatting: CEO/CTO/COO use `@` rather than comma when paired with company.

Client feedback data:

- Saadulev Khan: `Clockwrk built out both our finance app and web platform, and honestly, the whole experience was smooth from start to finish. The UI feels clean and intuitive, and everything just works the way it should. They understood what we needed without us having to over-explain - which made a big difference.`
- Moaz Khan Tareen, Principal Architect, Lagom Studio: `Clockwrk really understood what we were trying to build with Lagom from day one. They translated our vision into a brand and website that felt right immediately. The team is sharp, quick to respond, and easy to collaborate with. I'd definitely work with them again.`
- Zuraiz Sohal, COO @ Kanzo: `Working with Clockwrk on our ecommerce store was a great experience. They handled everything end-to-end and made the process feel straightforward, which isn't always the case with projects like this. The final result looks great and performs even better than we expected.`
- Mahad Saud, CEO @ Three Star Mills: `We needed a proper upgrade, and Clockwrk delivered exactly that. The new website feels modern, clean, and much more aligned with where our business is today. They worked efficiently without cutting corners, which we really appreciated.`
- Umer Sarwar Lodhi, USL: `Building a full ERP system is complex, but Clockwrk approached it with a lot of clarity and structure. From frontend to backend, everything was well thought out and executed properly. You can tell they take their work seriously - one of the more reliable and capable teams I've worked with.`

Mobile feedback has no reveal curtain. Reason cards are horizontally slidable like trust cards; testimonial section is a black card that expands/retracts based on feedback length.

## Cheat Code

Comes after feedback. Desktop layout has large title, subtitle, two cards (`Pick a plan`, `Book a call`), and bottom note. Mobile title line breaks:

```text
Use the cheat code
to get
started quickly and
get results
```

Mobile subtitle:

```text
Get an almost in-house
experience with a dedicated
remote team
```

Arrow icon circles in cards: green card uses black circle normally and swaps on hover; grey card uses white circle and stays white on hover.

## About / Trust / Showcase / Process

- About title: `Real people with top skills`; black rounded box with glass/logo circles.
- Trust title: `Why 100+ clients trust Clockwrk?`; desktop card stack, mobile horizontal slider.
- Showcase title: `Some of our recent work`, with `recent` lime; two-column desktop grid, scroll-activated mobile tiles.
- Known showcase clients include Pak Carriage, Ferox, Rift, Lagom Studio, Kanzo, Elythea.
- Process cards: Discovery session, Start engagement, Get steady updates, Get started CTA. Preserve existing card animations.

## Book A Call

Files: `book-a-call.html`, `styles/bookcall.css`.

Desktop flow: form/details -> services -> date picker -> confirmation. Mobile has its own flow. Booking API integration should send selected services and additional notes when enabled.

Calendly was replaced by custom booking UI. Current custom date picker behavior:

- Date picker can be the landing state for development when requested, otherwise form is landing.
- Selected date uses lime; current date uses greyish styling.
- Time slots expand/slide smoothly; changing dates should not snap upward.
- Selecting a date/time shows a dark loading overlay with centered `CW` in Orbitron, then the next screen appears.
- Confirmation title includes `Clockwrk Discovery Call`.
- Confirmation details include date/time, `30 minutes`, Zoom meeting with `assets/logos/zoom.png`, and timezone.

Error state: if n8n/booking endpoint is offline, CW overlay must clear and the card should resize smoothly. On mobile, alert/error content must push the footer down, not overlap it.

## Referral

Files: `referral.html`, `styles/referral.css`.

One-section referral landing with logo at top, no navbar, footer below. Email-only verification. No phone pill. Offer:

- User shares a referral code with a qualified client.
- Clockwrk qualifies the fit and attaches referral.
- User earns 5% as a one-time payout after the client's first payment clears.
- Payout examples are based on 5% of monthly plans.

Referral payout visual:

- Starts with Enterprise, then Business, then Startup in carousel/order.
- Prices should reflect current plan values and round up with no decimals.
- Use ticking/count-up animation inspired by pricing section.
- Cards should not reset on hover release.
- Fine print: `Based on 5% of our monthly plans`.

Referral card should expand after email submission to reveal a 6-digit numeric input field.

## Careers

Files: `careers.html`, `styles/careers.css`.

Careers listing transitions:

- On Apply, listings should fall/drop out from last element upward, smooth and synchronized.
- `Work with us` title slides left.
- Filter pills split: some slide left, some slide right.
- After listing content exits, form UI slides in.
- Footer must not snap upward when form loads.
- Reverse/back should feel smooth and preserve listing DOM/state.

Application form:

- Header category/title must not clip or wrap.
- Back control is a small arrow behind/next to the category row, not a large circle.
- Input fields sit lower and centered next to the active step label.
- CTA button must stay above input fields; dropdown menus must be above CTA.
- Only the active initial `You` step has extra top padding; other steps should not inherit it.
- Step subtitles above inputs:
  - You: `Basic info so we know who we're talking to.`
  - Experience: `Tell us about your background and what you've worked on.`
  - Work: `Share the type of work, role, or collaboration you're looking for.`
  - Done: `Final review before we get started.`

Careers focus/dropdown rules:

- Inputs and form dropdowns show lime border only while focused/open/active.
- After selection and close, border returns to normal.
- Dropdown option hover uses low-opacity grey and should not touch/merge visually.
- Dropdown selected/current option uses lime background with black text.
- Filter pills like `Type` remain lime with black text/icon when applied.

Application submitted UI:

- Recently copied from `/Users/mustafakhetran/Downloads/careers.html` and `/Users/mustafakhetran/Downloads/careers.css`, only final submitted UI.
- Current success block is scoped under `#cwAppSuccess` so internship success state should not be overwritten.
- Desired style is minimal: a card with the title and right-side SVG/illustration, then a concise message mentioning the applicant by name and that they'll be notified via their personal email.

## Assets / Favicons

- Client photos live in `assets/misc`.
- Zoom logo for booking confirmation: `assets/logos/zoom.png`.
- Favicons live under `assets/favicon`; `favicon.svg` has a black background and dark-mode handling was added.

## Current Context Folder State

This file is the only context file that should remain. Old duplicate context files were consolidated and removed.
