# Codex Task 1 — Fold n8n workflows into the Express API

**Repo**: `clockwrk-api`
**Branch**: `codex/kill-n8n`
**Goal**: Move the 7 active n8n workflows into new Express routes, then n8n can be deleted.

**Source of truth**: Full JSON of each workflow is exported to `n8n-export/*.json` in this repo. Read those to see exact SQL, exact validation, exact response shapes. Do not guess.

## Prereqs
- `npm install resend` (needed for the outbound emails n8n used to send)
- Add `RESEND_API_KEY` and `RESEND_FROM` to `.env` (values already exist in n8n's credential vault — ask founder to copy them across)

## Routes to build

Create a new file `routes/publicSite.js` and mount it under `/api/site` (**no auth** — these are public form endpoints). Rate-limit per IP: 10/hour, same pattern as `routes/hr.js`'s `applyLimiter`.

| Route | Method | n8n workflow file | Behaviour |
|---|---|---|---|
| `/api/site/newsletter` | POST | `2vMWtrUSPenv8ehL.json` | Insert into `newsletter_subscribers`, send confirmation email |
| `/api/site/booking` | POST | `49tZKYOFg4ZxpNip.json` | Insert into `bookings`, send internal alert + client confirmation |
| `/api/site/careers` | POST | `DnizEPglnbzWvS0Q.json` | Send Resend email with attached CV info. Already partly duplicates `/api/hr/apply/*` — check and merge if it's the same intent |
| `/api/site/referral` | POST | `wQ2Qd8X7xv8s0Z2D.json` | Insert into `referrals` |
| `/api/site/payment-confirm` | POST | `kwOBYFfEwxiRBsWT.json` | Insert into `payments`, insert dashboard alert, send both emails, if referral_code present insert into referrals |
| `/api/site/jobs` | GET | `rqS2aaFNSSUYPhsM.json` | Public list of `job_listings WHERE status = 'active'` |
| `/api/site/jobs` | POST (admin) | `h2fN4XEo15QWpgIs.json` | Auth-gated: insert into `job_listings`. Move under `/api/hr/listings` instead if that route already covers it |

## Non-goals
- Don't touch the internal dashboard flow — those already have proper Express routes
- Don't fix bugs in the n8n workflows; port behaviour as-is unless obviously wrong

## Definition of done
- All 7 workflows have Express equivalents that pass the same input → produce the same DB state + emails
- The founder can update the marketing site's form action URLs from `n8n.clockwrk.io/webhook/*` to `api.clockwrk.io/api/site/*`
- Commit with a message that lists each replaced workflow ID
- Leave `n8n-export/` in the repo — it's documentation for what was replaced

## After merging
Founder will:
1. Update the marketing site form URLs
2. `docker rm -f n8n` and remove from any auto-start
3. Delete `routes/n8n.js` (it's the dashboard-side n8n status view — dead once n8n is gone)
