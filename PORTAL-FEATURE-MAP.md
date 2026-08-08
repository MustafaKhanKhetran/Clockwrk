# Clockwrk Client Portal: Complete Feature and Wiring Map

Audited: 2026-08-07

This document describes the active V3 portal in `src/v3`, not the deleted V1/V2 files still visible in Git status. It maps what clients see, what each control does, where its data comes from, whether it persists, and which backend/database path is involved.

## Status legend

| Status | Meaning |
|---|---|
| **Server** | Reads or writes the Clockwrk API and MySQL database. Survives refresh and another device. |
| **Local** | Updates the in-memory React store or component state only. Lost on refresh. |
| **Mock** | Displays fixed seed data from `src/mocks.js`. |
| **Navigation** | Changes route or scroll position only. |
| **Dead** | Visible control has no meaningful handler or is disabled. |

## Runtime architecture

- React 19 and React Router render the client app.
- `src/App.jsx` defines public and protected routes.
- `src/v3/Shell.jsx` supplies navigation, global search, theme, alerts, create menus and mobile navigation.
- `src/v3/session.js` exposes a reactive login session.
- `src/v3/api.js` sends JSON requests to `VITE_API_URL`, defaulting to `http://localhost:3001`.
- The token and cached client identity are stored in `localStorage` as `clockwrk_portal_token` and `clockwrk_portal_client`.
- Every authenticated API call sends `Authorization: Bearer <token>`.
- A `401` clears the local session and returns the client to `/login`.
- `src/store.js` combines real server records with mock product/business state.
- The backend mounts `routes/clientPortal.js` at `/api/client` and uses MySQL through `db.execute()`.
- Client JWTs contain `type: client`, client ID, email, name, company and plan, and expire after seven days.
- Login and password endpoints allow 10 attempts per 15 minutes. General client API traffic allows 120 requests per minute.

## Global application shell

### Top navigation

| Element | Display | Action and wiring |
|---|---|---|
| CW logo | Clockwrk brand mark | **Navigation:** opens `/home`. |
| Home | Primary route | **Navigation:** `/home`. Active state comes from `NavLink`. |
| Requests | Primary route | **Navigation:** `/requests`. |
| Projects | Primary route | **Navigation:** `/projects`. |
| Deliverables | Primary route | **Navigation:** `/deliverables`. |
| Messages | Primary route | **Navigation:** `/messages`. |
| Find | Search icon, label and `Cmd+K` hint | Opens global workspace search. `Cmd+K` and `Ctrl+K` also open it. |
| Notification bell | Bell and unread dot | Opens a notification popover. The dot reads hardcoded store notifications; opening it does not mark them read. |
| Theme button | Moon or sun icon | **Local persistent:** switches `data-v3-theme` and stores `portal_theme` in `localStorage`. |
| Create | Text plus icon | Opens New request and New project menu. |
| Account avatar | Signed-in initials | Opens Billing, My site, Help, Settings and, on mobile, Messages. |

### Live status rail

The rail displays:

- Team online: always displayed from UI state, not a presence API.
- Building now: count of requests whose portal status is `active`.
- Awaiting approval: count whose status is `review`.
- In queue: count whose status is `queued`.
- Subscription mode: active requests versus `baseSlots + extraSlots`.
- Retainer mode: `hoursRemaining` versus `hoursAllowance`.
- Current route name.

Request counts can come from the server. Team presence, slots, retainers and hours are local/mock product state.

### Global search

Search contains navigation pages, projects and requests. It supports:

- Text filtering by title and record type.
- Arrow Up/Down selection.
- Enter to open the selected result.
- Escape or backdrop click to close.
- Mouse hover selection.

Requests use the current store. Projects always come from mock projects, even after real projects load. Search never calls the server.

### Notification popover

The three initial notifications are:

- Next plan payment due, opening Billing.
- Three deliveries ready for review, opening Requests.
- Website health report generated, opening Requests because no route is specified.

They are mock store records. `markNotificationsRead()` exists but is never called, so the unread dot remains.

### Create menu

- New request opens `/requests/new`.
- New project opens `/projects/new`.
- Route changes close the menu automatically.

### Mobile navigation

The bottom bar displays Home, Requests, Projects, Deliverables, Create and More. Create opens the same create menu; More opens the account menu. Messages and utility pages are reached through More.

## Login: `/login`

### Displayed content

- Clockwrk mark and client workspace introduction.
- “Team online” presentation text.
- Email address field.
- Password field.
- Open workspace submit button.
- Guidance to contact the workspace owner or project manager for access.

### Controls and backend

| Control | Behavior |
|---|---|
| Email | Controlled field; browser email autocomplete. |
| Password | Controlled field; requires at least eight characters client-side. |
| Open workspace | **Server:** `POST /api/client/login` with email and password. |

Backend behavior:

1. Looks up `clients` by email.
2. Requires `status = active` and a stored password hash.
3. Compares the password with bcrypt.
4. Signs a seven-day JWT.
5. Returns safe client fields and the token.
6. Frontend stores both, then routes to `/home`.

Errors are displayed and the password field is cleared.

Missing: forgot-password, invitation setup, MFA and session/device management.

## Home: `/home`

### Hero

- Displays the fixed date `Tuesday · 4 August`.
- Displays the mock client’s first name, currently `Sardar`.
- “Start a request” opens `/requests/new`.
- “Talk to your team” shows mock team avatars and opens `/messages`.
- The circular “Right now” dial counts active plus review requests.
- Dial legend shows building, needing review and queued counts.

Request counts may be server-backed. Name, date and team are mock data.

### Account alert

The alert condition comes from store fields `paused`, `pauseReason`, `paymentStatus`, `paymentDueAt` and `paymentAmount`.

- Transfer due: asks the client to transfer the amount by the due date.
- Transfer overdue: warns that production may pause.
- Payment-caused pause: says production is paused until billing is resolved.
- Client pause: says the queue is preserved and can be resumed later.
- “Review billing” opens `/billing`.

`paymentStatus` becomes `due` whenever `/api/client/invoices` returns a positive `total_pending`; otherwise it becomes `paid`. The displayed amount remains the local default `$1,550`, not `total_pending`.

### Four glance tiles

| Tile | Display | Click |
|---|---|---|
| In motion | Active count and active request titles | Opens Requests. |
| Waiting on you | Review count and review cue | Opens Requests. |
| Portfolio | Number of active mock projects | Opens Projects. |
| Delivered | Completed request count | Opens Billing. |
| Care hours in retainer mode | Remaining versus allowance | Opens Billing. |

### Live workstream

Each active request displays:

- Sequence number.
- Mock project initials and project name.
- Request type and title.
- Latest changelog text or brief.
- Building status.
- Progress meter.

Clicking opens `/requests/:requestId`. “Open board” opens Requests. “Add to the queue” opens New Request. The footer’s available-slot calculation is hardcoded around two slots instead of the selected plan.

### Review desk

Each review card displays project name, request title, delivered date, file count and an arrow. Clicking opens the request detail page. The stacked cards visually fan on hover. “Review everything” opens Requests.

### Project ribbon

Displays every mock project with initials, name, tagline, progress and status. Clicking opens its project detail. “All projects” opens Projects.

### Recent signals and team presence

Both sections are entirely mock data. Team member buttons open Messages.

## Requests board: `/requests`

### Page header and filter

- Page title and explanation.
- “New request” opens `/requests/new`.
- Project filters display All work plus each mock project and request counts.
- Filtering happens in memory.

### Kanban columns

The four columns map portal statuses:

- `active` to Building.
- `review` to Review.
- `queued` to Queue.
- `done` to Shipped.

Each card displays:

- Project code and project name.
- Status.
- Service/type.
- Request title.
- Brief.
- Priority with color treatment.
- Due or delivered date.
- Progress for active work.
- Queue position and drag handle for queued work.

Clicking any card opens `/requests/:requestId`. Empty columns contain a New Request button.

Queue cards are draggable. **Local:** `store.reorderQueue()` changes only browser state. It does not call the API. With a project filter active, filtered indices are incorrectly applied to the global queue.

### Backend source

`GET /api/client/requests`:

- Selects only requests matching the JWT client ID.
- Maps DB states `queue`, `in_progress`, `in_review`, `revision`, `completed` to portal states.
- Joins the project name.
- Loads only request comments marked `visibility = client`.
- Loads files belonging to the client and request.
- Derives queue position oldest-first.

The board still resolves project visual details against mock projects instead of using `projectName` returned by the API.

## New Request: `/requests/new`

This is a four-step full-page composer.

### Step 1: Project

- Displays real projects from `GET /api/client/projects` after loading.
- Falls back to three mock projects on first paint or API failure.
- The first valid project is automatically selected.
- Each option displays project initials, name and description/tagline.

### Step 2: Service

Displays 35 creative services plus 30 included technical services, grouped by category. Clients can click a service or drag it into the selection dock.

Categories include Development, Design, Branding, Presence, Outdoor & Print, Security, Hosting, Domains, Email, Maintenance, Performance, Analytics, SEO and Setup.

The panel states that everything shown is included in the plan. Paid hosting/mailboxes and Care-only services are excluded.

### Step 3: Brief

- Request title, required before continuing.
- Detailed brief, required before continuing.
- “Add files or links” is **Dead**: it has no upload/file handler and defaults to form-button behavior.

### Step 4: Placement

- Normal: standard queue.
- High: ahead of normal work.
- Urgent: team review required.
- Recap displays project, category, service, title and brief.

### Footer and submission

- Back returns one step.
- Cancel returns to Requests.
- Continue advances one step.
- Add to queue calls `store.createRequest()`.

Server submission uses `POST /api/client/requests` with project ID, title, description, combined type and priority. The backend verifies that the project belongs to the client, inserts status `queue`, normalizes priority, returns the new request and merges it into the frontend store.

No attachment, ETA, capacity selection, add-on selection or request estimate is transmitted.

## Request Detail: `/requests/:requestId`

### Header and facts

- Back button returns to Requests.
- Project initials, project name and request type.
- Title, brief and status.
- Priority.
- Started date or “Not started.”
- Delivered, expected or unscheduled date.
- Revision count.
- Progress meter when present.

Real requests have empty timeline/changelog and zero revisions because those fields are not loaded by the API. Project visuals still depend on mock project IDs.

### Review decision panel

Only appears for `review` requests.

- Approve & start next: **Local.** Marks the request done and promotes the first queued request if production is not paused.
- Request changes: opens a textarea.
- Send revision notes: **Local.** Adds the note, increments revisions, and moves work to active or the front of queue depending on slot availability.

Neither action is sent to the API or database.

### Delivery files

Each file displays type icon, name, size, delivery date, version and Latest/Previous state. A file with a URL opens/downloads that URL. A file without a URL renders an unavailable link style. Server files come from the `files` table through the requests endpoint.

### Conversation

Displays comments loaded from `request_comments` where visibility is client, plus mock/local comments. “Write to the project team” adds a comment to the local store only. It does not create a backend comment or message.

### Timeline and work notes

Mock requests show complete timelines and changelogs. Real requests receive empty arrays from the API, so they show a generic queued entry and “No production notes yet.”

## Projects: `/projects`

### Display

- New project button.
- All, Active and Paused filters.
- Project index and initials.
- Status and technology stack.
- Name, description and crew avatars.
- Crew count.
- Progress meter.
- Active and shipped request counts.

Clicking a project opens `/projects/:projectId`.

Despite `GET /api/client/projects` loading real projects into the store, this page always renders `mocks.js` projects. It is currently a mock portfolio page.

## New Project: `/projects/new`

### Displayed fields

- Project name.
- Type: Software, Website, Brand, Campaign or Internal.
- Primary goal.
- Audience.
- Success measure.
- Target date.
- Budget context: Retainer, One-time build or Not decided.
- Add source material area.

Only project name and type are controlled React state. Goal, audience, success, date and budget are not captured. Source-material upload has no input or handler.

“Create project” only shows a local success screen. There is no client API endpoint for project creation and no database write.

## Project Detail: `/projects/:projectId`

Only the three mock projects can resolve on this route.

### Header and progress

- Back to Projects.
- Project initials, status, stack, name and description.
- Add request opens New Request but does not preselect this project.
- Progress, started date, target date, request count and file count.

### Project work

Lists requests associated with the mock project ID, with type, title, status and progress. A row opens Request Detail. “Open board” opens the unfiltered Requests board.

### Live workspace

Displays a mock preview URL and label. “Open build” opens the preview in a new tab.

### Recent deliverables

Displays up to five files gathered from the project’s requests. Files with URLs open; URL-less files are unavailable.

### Project crew and brief

Displays mock project manager, account manager and delivery team. Crew buttons open Messages. Brief and stack are mock fields.

## Deliverables: `/deliverables`

### Summary

- Number of files found in request deliverables.
- Number of project IDs represented.
- “Latest delivery,” currently taken from the first array item rather than date-sorted.

### Search and filters

- Search matches file name, request title and project name.
- Project filter uses mock projects.
- Format filter is generated from available file types.

### Delivery index

Every row displays:

- File-type icon.
- File name, size and version.
- Project initials and project name.
- Parent request title.
- Delivery date.
- Latest or Previous version.
- Download/open button.

Only files with a URL can be opened. Although `GET /api/client/files` exists, this page does not call it; it derives files from `GET /api/client/requests` deliverables.

## Billing: `/billing`

### Real billing data

On shell load, the portal calls:

- `GET /api/client/me` for plan, billing cadence and next payment date.
- `GET /api/client/invoices` for payment rows and total pending.

The backend reads the `clients` and `payments` tables using client ID/email. Plan and billing cadence update local store display; they are not edited server-side.

### Next payment panel

When a server next-payment date exists, it displays:

- Payment outstanding or Next payment.
- Pending amount and due date, or renewal date.
- Manual transfer guidance.
- Company and billing cadence.
- A weekly-plan savings button that changes the displayed cadence locally.

### Subscription card

Displays active subscription/retainer, plan name, slot or care description, animated price and weekly/monthly control.

- Cadence buttons: **Local.** Recalculate prices but do not change the database or invoice.
- Change plan: opens the local plan lineup.
- Subscription options: opens the pause/retainer/cancel dialog.

### Capacity card

- Active slots as long pills containing request name, progress, due date and status.
- Clicking used capacity opens Request Detail.
- Open slots are stacked and open New Request.
- Add capacity adds one local slot at `$400/week`; no order, payment or API request is created.

### Plan lineup

Displays Startup, Business and Enterprise with slots, description and weekly price. Clicking a plan immediately changes local plan and slot capacity. It has no confirmation, proration, transfer or API persistence.

### Included Care

Displays Care, Care+ or Care Pro based on current subscription, animated monthly value and the first six included benefits. “Compare ongoing care” reopens the subscription plan lineup rather than a distinct care comparison.

### Invoice history

For server data, each row displays:

- Generated `INV-####` number from payment ID.
- Submitted date.
- Plan and billing cadence.
- Amount.
- Paid, Pending or raw status.

The API also returns fee, received amount and confirmation date, but the UI does not display them. There is no invoice PDF or download button.

### Subscription options modal

- Pause production: **Local.** Sets paused state only.
- Move to ongoing care: **Local.** Switches to current care tier and clears subscription plan.
- Cancel at period end: **Dead.** Only closes the modal.
- Close/backdrop: closes without changes.

Resume subscription, extra care hours and retainer annual cadence exist in store data but are not exposed here.

## Messages: `/messages`

### Threads

- Uses real projects after API load, otherwise mock projects.
- Each project is one conversation channel.
- Desktop sidebar and mobile select switch the active project.
- Footer displays mock online Clockwrk team members.

### Conversation

`GET /api/client/messages?project_id=<id>` loads records for the client and project. Legacy records with `NULL project_id` appear in every thread. The frontend polls every ten seconds.

Messages display sender, timestamp, content and pending state. Team senders are presented uniformly as “Clockwrk.”

### Composer

- Text input.
- Send button.
- Disabled attachment button.

Sending calls `POST /api/client/messages`. The backend verifies project ownership, inserts into `client_messages`, returns the inserted message and creates a `dashboard_alerts` row for the team dashboard. The frontend uses optimistic rendering and restores failed text.

### Book a call

Displays four hardcoded times. Clicking a time closes the dialog; Confirm also closes it. No selected time is tracked and no booking API is called.

## Help: `/support`

### Help routes

- Open a ticket and Ask the team open the support form.
- Book working time currently opens the same support form, not booking.
- Portal guide scrolls to FAQs.

### Ticket list

`GET /api/client/tickets` displays ticket number, subject, status and update date. Ticket rows are buttons with no handler, even though detail and reply APIs exist.

### New ticket modal

Captures subject, category and details. Categories are Technical Issue, Billing Question, General Inquiry, Revision Request and Feature Request. Priority is always submitted as Normal.

`POST /api/client/tickets` inserts into `client_tickets` and creates a support alert in `dashboard_alerts`. The frontend reloads the ticket list after success.

### Quick answers

Static accordion answers explain approvals, unlimited queueing, file storage and retainers.

### Unused backend support functions

- `GET /api/client/tickets/:id` returns ticket and replies.
- `POST /api/client/tickets/:id/reply` inserts a client reply and reopens the ticket.

The current portal has no ticket detail route or reply UI.

## My Site: `/site`

This page is local/mock and does not call the client API.

### Health strip

Displays hardcoded healthy state, two-minute check age, 99.99% uptime, four hours since backup and zero alerts.

### Hosting tab

Displays mock domain, uptime, Singapore region, Edge + Node runtime, valid SSL and automatic backup policy. “Run backup now” inserts a local backup record that is not visibly listed and is lost on refresh. “Open live site” has no handler.

### Domains tab

Displays domain, renewal date and auto-renew toggle. Toggling updates local state only. The store has domain registration logic, but no UI invokes it.

### Email tab

Displays mailbox count, address, plan and Active status. The mock shape uses `address`, while this page reads `email`, so mailbox addresses can render blank.

### Security tab

Displays a hardcoded A grade and passing state. Monitor switches update local state only. Missing run dates fall back to “Checked today.”

### Reports tab

Displays report type, title, date and download icon. Report cards have no handler. The mock shape uses `type`, `period` and `generatedAt`, while the page expects `title` and `createdAt`, producing missing titles and fallback dates.

## Settings: `/settings`

### Section index

Profile, Brand kit, Notifications, Your people and Security links scroll to anchors on the same page.

### Profile

- Name and company are editable.
- Email is read-only.
- Save profile calls `PATCH /api/client/me` and updates `clients.name` and `clients.company`.
- The returned client replaces the cached session identity.
- Success briefly displays “Saved”; API errors display inline.

Phone is supported by the backend but absent from the UI.

### Brand kit

- Primary-logo download button has no handler.
- Add brand assets has no handler.
- Five color swatches are decorative buttons with no copy/edit behavior.

### Notifications

Four uncontrolled toggles: Delivery ready, Team message, Billing activity and Monday summary. No value is read or persisted.

### Your partners and team

Displays four mock client-side members, approval permission and billing permission. Invite and remove mutate component state only. Permissions are uncontrolled and are lost on refresh. This is the client’s company team, not Clockwrk delivery staff.

### Security

- Current and new access-code fields are uncontrolled.
- Update access code has no handler.
- The backend supports `POST /api/client/change-password`, including current-password verification and bcrypt rehashing, but the UI never calls it.
- Sign out resets server-loaded records to seeds, clears token/client storage and returns to Login.

## PWA and installation

The portal is installable through `vite-plugin-pwa`:

- Web app manifest with Clockwrk icons and standalone mode.
- Generated service worker and update toast.
- Android/Chromium native installation using `beforeinstallprompt`.
- iOS Safari Share to Add to Home Screen instructions.
- In-app-browser detection for Instagram, WhatsApp, LinkedIn, Gmail and related browsers.
- Prompt starts on the second visit.
- “Not now” suppresses installation for 14 days.
- Nothing renders when already installed.
- API paths use Network First service-worker caching for up to 24 hours.

## Backend endpoints present but unused by the current UI

| Endpoint | Backend capability | Portal status |
|---|---|---|
| `GET /api/client/dashboard` | Counts projects, tickets, unpaid totals, last payment and recent records | Never called. |
| `POST /api/client/change-password` | Verifies and replaces password hash | Visible UI does not call it. |
| `GET /api/client/files` | Returns client/project files | Deliverables derives files from Requests instead. |
| `GET /api/client/tickets/:id` | Returns a ticket and replies | No ticket detail route. |
| `POST /api/client/tickets/:id/reply` | Adds a client reply and reopens ticket | No reply UI. |

## Local store capabilities with no active UI

- Delivery ratings and testimonial permission.
- Remove extra slot.
- Explicitly mark payment due, overdue or paid.
- Log, reset or buy retainer hours.
- Resume a subscription from retainer mode.
- Subscribe directly to a retainer tier.
- Order, request or toggle paid services.
- Consume service preselection.
- Register a domain.
- Buy launch bundles.
- Toggle subscription add-ons.
- Mark notifications read.

## Dead data and repository residue

- `SVC_EMOJI` and `FILE_EMOJI` are exported but unused.
- Three launch bundles are modeled but never displayed.
- Axios is installed but all API code uses `fetch`.
- Tailwind/PostCSS are configured, but active V3 UI styling is handwritten CSS.
- Prompt specification Markdown files are implementation history, not runtime features.
- `AUDIT.md` and `CURRENT-STATE.md` are useful history but already stale in places.
- The working tree contains staged deletion of the prior portal and uncommitted V3/API integration changes. The active source builds, but the repository is not currently a clean, committed release state.

## Current production boundary

### Persisted and real

- Authentication and seven-day client sessions.
- Client identity loading and profile changes.
- Real project list loading for Messages and New Request.
- Real request loading and request creation.
- Real invoice/payment history loading.
- Real project-scoped message read/send.
- Real ticket list and ticket creation.
- Real file metadata included with requests.

### Not yet persisted

- Project creation.
- Approval and revision decisions.
- Request comments.
- Queue order.
- Plan/cadence/slot/add-on changes.
- Pause, cancellation and retainer transitions.
- Care-hour accounting.
- Booking calls.
- File uploads and most downloads.
- Team/member administration.
- Notification preferences and read state.
- Password change from the visible UI.
- Site operations, domains, mailboxes, monitors and reports.

