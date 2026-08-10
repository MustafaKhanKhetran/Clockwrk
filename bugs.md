# Clockwrk Bug Master File

_Last updated: 2026-05-23_
_Audited by: Claude Sonnet 4.6 across 3 audit passes + 1 validation pass + re-audit 2026-05-23_

---

## Context & Stack

**Frontend:** Static HTML/CSS/JS hosted on Hostinger at clockwrk.io
**Automation:** n8n self-hosted locally via Docker, exposed via Cloudflare Tunnel at n8n.clockwrk.io
**Database:** MySQL running locally via Docker
**Email:** Resend (transactional outbound from hello@clockwrk.io)
**Edge:** Cloudflare Workers, KV, Queues
**Meetings:** Zoom API

---

## Backend Status

### ✅ Confirmed Working

- **Booking flow** — n8n `/booking`: validates fields, checks slot availability in MySQL, creates Zoom meeting, inserts to `bookings` table, sends confirmation email to client via Resend, sends internal notification to mustafakhankhetran1@gmail.com
- **Slots flow** — n8n `/slots`: generates Mon–Fri 9am–6pm PKT slots, filters against MySQL confirmed bookings
- **Referral OTP** — `referral-send-otp` Worker: validates email, generates 6-digit OTP, stores in KV with 10min TTL, sends OTP email via Resend
- **Referral Verify** — `referral-verify-otp` Worker: checks OTP against KV, generates CW-XXXXXX code, stores permanently in KV, posts to n8n, queues if n8n fails
- **Referral Queue** — `referral-queue-consumer` Worker: consumes queue, posts to n8n `/referral` webhook, retries 20x with 60s delay
- **Referral Dead Letter** — `referral-dead-letter-alert` Worker: emails manual SQL insert instructions after 20 failed retries
- **Referral n8n** — `/referral` webhook: checks `referrers` table for duplicate, inserts new referrer with code
- **Missed Booking Alert** — `missedbookingalert` Worker: fires when n8n is offline during booking, emails booking details for manual follow-up. Returns 405 on GET — correct, POST only
- **Newsletter** — n8n `/newsletter`: validates email+type, checks MySQL for duplicate, inserts to `newsletter_subscribers`, sends welcome email via Resend. Separate emails for marketing vs careers type.

### ❌ Not Built Yet

- **Careers application backend** — `/application` n8n webhook does not exist. careers.html application form is pure UI only
- **Careers internship backend** — `/internship` n8n webhook does not exist. Same — pure UI
- **Payment / Paddle** — Paddle sandbox checkout is wired for pricing plans and White Label add-on. Production token/webhook still needed before launch
- **Legal pages** — /terms, /privacy, /cookie-policy do not exist

### ✅ Infrastructure Created

- **sitemap.xml** — created at project root, submit to Google Search Console after deploy
- **robots.txt** — created at project root

### ⚠️ Careers Form Bugs — Hold Until Backend Built

BUG-33, BUG-34, BUG-35, BUG-60, BUG-71, BUG-72, BUG-73, BUG-74, BUG-82
Fix these at the same time as building the careers n8n workflows.

---

## Summary Table

| #      | Severity | File                            | Description                        | Status                                   |
| ------ | -------- | ------------------------------- | ---------------------------------- | ---------------------------------------- |
| BUG-01 | —        | landing.css:203                 | `--tick-green-border` undefined    | ✖ Closed — not a bug                     |
| BUG-02 | Low      | index.html:1086                 | `aria-hidden="false"` redundant    | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-03 | —        | index.html:1745                 | "Book a quick session" wrong href  | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-04 | —        | index.html:2911                 | "Book a call" card wrong href      | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-05 | —        | index.html:2482, 2514           | Pricing Proceed → #top             | Open — Reopened — fix not found in current file as of re-audit 2026-05-23. validatePricingCheckout() returns true but no redirect to /checkout occurs; the Subscribe button is a dead end after form validation passes. |
| BUG-06 | —        | index.html:428–507              | Mixed icon systems in table        | ✖ Closed — intentional design            |
| BUG-07 | —        | global.css:63                   | `.mobile-only` never visible       | ✖ Closed — working correctly             |
| BUG-08 | —        | book-a-call.html:595            | `syncBookCallDateStep()` empty     | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-09 | Medium   | book-a-call.html:505–507        | Lucide race condition              | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-10 | —        | book-a-call.html:139–140        | Consent checkbox id/for broken     | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-11 | —        | careers.html:577, 591           | All filters broken (casing)        | ✖ Closed — not a bug                     |
| BUG-12 | —        | careers.html:1088               | appConsent label for missing       | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-13 | —        | careers.html:1583–1584          | Dead .cw-sheet JS references       | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-14 | —        | book-a-call.html:881, 1075      | n8nReachable before declaration    | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-15 | —        | book-a-call.html:522            | bookCallDateEmbed dead var         | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-16 | —        | book-a-call.html:1598           | .bk-cf-legal targets nothing       | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-17 | —        | careers.html:220–224            | Dead HTML filter btn/badge         | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-18 | —        | careers.css:473–474, 2416–2513  | 15 orphaned .cw-sheet rules        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-19 | —        | book-a-call.html:366            | bkCfCompanyField id unused         | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-20 | —        | book-a-call.html:50             | data-book-call-intro unused        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-21 | —        | global.css:55                   | --tick-green var unused            | Open — Reopened — fix not found in current file as of re-audit 2026-05-23. --tick-green was removed from global.css but landing.css:204 still uses var(--tick-green); the CSS variable is undefined, causing the color property to fall back to inherited value. |
| BUG-22 | Medium   | all pages                       | Social links href="#"              | Open                                     |
| BUG-23 | Medium   | all pages                       | Legal links href="#"               | Open — blocked on legal pages            |
| BUG-24 | Medium   | book-a-call.html:143–144        | Consent legal links href="#"       | Open — blocked on legal pages            |
| BUG-25 | —        | book-a-call.html                | OG meta title=description          | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-26 | —        | careers.html                    | OG meta title=description          | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-27 | —        | referral.html                   | OG meta title=description          | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-28 | Medium   | referral.html:192–194           | Referral consent links href="#"    | Open — blocked on legal pages            |
| BUG-29 | Medium   | referral.html:395–397           | Lucide race condition              | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-30 | —        | referral.html:641–654           | data.error checked before res.ok   | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-31 | —        | referral.html:656, 776          | OTP fetches no timeout             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-32 | —        | referral.html:883, styles/referral.css:1268 | Clipboard copy silent failure      | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-33 | High     | careers.html:2603–2634          | App form: success on error         | Open — with backend                      |
| BUG-34 | High     | careers.html:2725–2749          | Internship form: success on error  | Open — with backend                      |
| BUG-35 | Medium   | careers.html:2604, 2726         | Forms: no fetch timeout            | Open — with backend                      |
| BUG-36 | —        | all pages footer                | Newsletter button no handler       | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-37 | —        | index.html:242                  | Two h1 elements in DOM             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-38 | —        | script.js:2024                  | Section 8 duplicated               | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-39 | —        | script.js:1908                  | entry.itemEl duplicated            | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-40 | —        | script.js:270                   | pageYOffset deprecated             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-41 | —        | all pages                       | No canonical tags                  | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-42 | —        | Hostinger root                  | No robots.txt                      | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-43 | Medium   | all pages                       | Lucide script missing defer        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-44 | —        | index.html:1942–2228            | Images missing loading=lazy        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-45 | —        | index.html                      | Title hyphen vs og:title en-dash   | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-46 | —        | assets/misc/                    | HKK-Client.svg unreferenced        | ✅ FIXED — file deleted                  |
| BUG-47 | —        | book-a-call.html                | zoom.png note                      | ✖ Closed — not a bug                     |
| BUG-48 | —        | book-a-call.html:1105           | Health-check ignores 4xx           | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-49 | —        | book-a-call.html                | sendLead catch is safe             | ✖ Closed — confirmed safe                |
| BUG-50 | —        | referral.html:281–310           | OTP inputs no type attr            | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-51 | —        | referral.html:501–513           | Payout carousel no reset           | ✖ Closed — intentional feature           |
| BUG-52 | —        | —                               | Duplicate of BUG-33/34             | ✖ Closed — duplicate                     |
| BUG-53 | —        | index.html:3047, script.js:2847 | Footer Enter key reloads           | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-54 | —        | referral.html:377, 1020         | Same Enter key issue               | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-55 | —        | book-a-call.html                | XSS guest email innerHTML          | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-56 | —        | book-a-call.html                | XSS name/email insertAdjacentHTML  | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-57 | —        | script.js:496                   | syncPricingUI no arg               | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-58 | —        | index.html:1000, 1007           | nooooow! screen reader             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-59 | —        | index.html:297                  | Duplicate h2 in DOM                | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-60 | Low      | careers.html:2600               | applicantName dead var             | Open — with backend                      |
| BUG-61 | —        | book-a-call.html:1028           | Only native validation             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-62 | —        | all pages                       | html missing dir=ltr               | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-63 | —        | book-a-call.html:909            | call-name whitespace passes        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-64 | —        | book-a-call.html:911            | call-company whitespace passes     | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-65 | —        | book-a-call.html:901, styles/bookcall.css:2282 | No custom error UI Step 1          | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-66 | —        | book-a-call.html:338            | bkCfName no required               | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-67 | —        | book-a-call.html:349            | bkCfEmail no required              | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-68 | —        | book-a-call.html:1521           | bkCfNotes not trimmed              | ✖ Closed — already trimmed               |
| BUG-69 | —        | book-a-call.html:1772           | Guest email no duplicate check     | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-70 | —        | book-a-call.html:1074           | Offline booking CTA goes dead      | ✖ Closed — not a bug, fully working      |
| BUG-71 | Medium   | careers.html:2330               | Phone no format check              | Open — with backend                      |
| BUG-72 | Medium   | careers.html:2330               | Name whitespace passes             | Open — with backend                      |
| BUG-73 | Medium   | careers.html:2580               | App btn re-enable via success only | Open — with backend                      |
| BUG-74 | Medium   | careers.html:2725               | Internship same btn issue          | Open — with backend                      |
| BUG-75 | —        | referral.html:606               | OTP send no rate limit             | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-76 | —        | referral.html:606               | OTP buttons not disabled in flight | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-77 | —        | referral.html:282               | Duplicate of BUG-50                | ✖ Closed — duplicate                     |
| BUG-78 | —        | referral.html:735               | OTP error not cleared on retype    | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-79 | —        | referral.html:641               | Non-JSON error crashes OTP         | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-80 | —        | index.html:3006                 | Newsletter Enter reloads page      | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-81 | —        | book-a-call.html:918            | Email a@b passes (server catches)  | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-82 | Medium   | careers.html:2330               | Email regex on untrimmed value     | Open — with backend                      |
| BUG-83 | —        | book-a-call.html, referral.html | Newsletter handler not loaded      | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-84 | —        | all pages                       | OG image path may not match        | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-85 | —        | .htaccess                       | Clean URL rewriting not working    | ✖ Closed — environment issue             |
| BUG-86 | —        | book-a-call.html                | Dates with no slots not disabled   | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-87 | —        | index.html                      | Tech carousel broken images        | ✖ Closed — CDN works in production       |
| BUG-88 | —        | index.html, script.js           | Mobile service hint taps do nothing | ✅ FIXED — Re-verified 2026-05-23        |
| BUG-89 | —        | index.html                      | Remove "Need development?" services controls | ✅ FIXED — Re-verified 2026-05-23 |

---

## Re-audit — 2026-05-23

### BUG-90 — Pricing "Subscribe" button is a dead end — no redirect to checkout

- **File:** script.js:1052–1063 (proceedButtons handler), script.js:596–624 (validatePricingCheckout)
- **Issue:** When the user fills in name/email/company/consent in the pricing checkout overlay and clicks "Subscribe" (desktop) or "Proceed → Subscribe" (mobile), `validatePricingCheckout()` is called and returns `true` on success, but the return value is never used and no redirect to `/checkout` (or any URL) is performed. The user sees no response — the form just stays open. checkout.html exists at project root but is never reached from the pricing page conversion path.
- **Status:** Open

### BUG-91 — `pricingShowError` silently drops error message text

- **File:** script.js:534–540
- **Issue:** `pricingShowError(field, message)` receives a `message` string but never calls `getPricingErrorMessage(field)` to create or populate the error message element. The `message` parameter is completely unused. The function only adds the `bk-field-error` class (red border) but never shows any text. Users see a red border with no explanation of what is wrong. `getPricingErrorMessage` is a fully implemented helper at line 520 that creates the DOM element — it just isn't called from `pricingShowError`.
- **Status:** Open

### BUG-92 — checkout.html: Paddle inline container missing required `class` attribute

- **File:** checkout.html:58
- **Issue:** The Paddle inline checkout container is `<div id="paddle-checkout-container"></div>`. Paddle v2's `Paddle.Checkout.open()` with `displayMode: "inline"` uses `frameTarget: "paddle-checkout-container"` as a CSS class selector. Because the element only has an `id` and no `class="paddle-checkout-container"`, Paddle cannot locate the target container and the inline checkout iframe will not render.
- **Status:** Open

### BUG-93 — checkout.html: Paddle.js CDN script is render-blocking

- **File:** checkout.html:21
- **Issue:** `<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>` in `<head>` has no `defer` or `async` attribute. This blocks HTML parsing until Paddle.js downloads and executes, delaying time-to-first-paint on the checkout page. The script should have `defer` (or be moved before `</body>`).
- **Status:** Open

### BUG-94 — index.html: Feedback section images missing `loading="lazy"`

- **File:** index.html:2692–2726, 2903–2916, 2955–2983
- **Issue:** BUG-44 added `loading="lazy"` to images in the about/showcase sections (lines 1942–2228) but missed three groups of below-fold images: (1) the feedback skill-panel logo images (figma, ps, ai, js, html, css, stripe, paypal, aws — lines 2692–2726), (2) the desktop client avatar circle images (SK-Client, MKT-Client, etc. — lines 2903–2916), and (3) the mobile testimonial avatar images (lines 2955–2983). All are well below the fold and should be lazy-loaded.
- **Status:** Open

### BUG-95 — pricing.css: Duplicate `.pricing-title .mobile-only` rule

- **File:** styles/pricing.css:1226–1232
- **Issue:** Inside the `@media (max-width: 860px)` block, the rule `.pricing-title .mobile-only { display: inline; }` appears twice in succession (lines 1226–1228 and 1230–1232). The second occurrence is dead code. While not functionally broken, it is a code quality issue that should be cleaned up.
- **Status:** Open

---

## Open Bugs by Category

### 🔴 Conversion Path

| Bug    | Page          | What                                                    |
| ------ | ------------- | ------------------------------------------------------- |
| BUG-05 | index.html    | Subscribe button on pricing does not redirect to /checkout |
| BUG-90 | script.js     | validatePricingCheckout passes but no redirect follows  |

### 🟠 Missing Error Handling

| Bug    | Page          | What                                                    |
| ------ | ------------- | ------------------------------------------------------- |
| BUG-91 | script.js     | pricingShowError discards message text — no error shown |

### 🟠 Validation

No remaining standalone validation bugs outside careers backend work.

### 🟠 Dead Links — Blocked on Legal Pages

| Bug    | Page             | What                                    |
| ------ | ---------------- | --------------------------------------- |
| BUG-22 | all pages        | X and LinkedIn footer links href="#"    |
| BUG-23 | all pages        | Terms, Privacy, Cookie Policy href="#"  |
| BUG-24 | book-a-call.html | Consent terms/privacy href="#"          |
| BUG-28 | referral.html    | Referral consent terms/privacy href="#" |

### 🟡 CSS

| Bug    | File            | What                                          |
| ------ | --------------- | --------------------------------------------- |
| BUG-21 | landing.css:204 | var(--tick-green) used but variable undefined |
| BUG-95 | pricing.css     | Duplicate mobile-only rule                    |

### 🟡 SEO / Meta / Performance

| Bug    | Page          | What                                                  |
| ------ | ------------- | ----------------------------------------------------- |
| BUG-94 | index.html    | Feedback section images missing loading=lazy          |
| BUG-93 | checkout.html | Paddle.js CDN script is render-blocking               |

### 🟡 Checkout / Paddle

| Bug    | Page          | What                                                  |
| ------ | ------------- | ----------------------------------------------------- |
| BUG-92 | checkout.html | paddle-checkout-container missing class attribute     |

### ✅ Dead Code Cleanup — All Fixed

| Bug    | File             | What                                 | Status     |
| ------ | ---------------- | ------------------------------------ | ---------- |
| BUG-13 | careers.html     | Dead .cw-sheet JS references         | ✅ FIXED   |
| BUG-14 | book-a-call.html | n8nReachable used before declaration | ✅ FIXED   |
| BUG-15 | book-a-call.html | bookCallDateEmbed dead variable      | ✅ FIXED   |
| BUG-16 | book-a-call.html | .bk-cf-legal targets nothing         | ✅ FIXED   |
| BUG-17 | careers.html     | Dead filter btn/badge HTML           | ✅ FIXED   |
| BUG-18 | careers.css      | 15 orphaned .cw-sheet rules          | ✅ FIXED   |
| BUG-19 | book-a-call.html | bkCfCompanyField id unused           | ✅ FIXED   |
| BUG-20 | book-a-call.html | data-book-call-intro unused          | ✅ FIXED   |
| BUG-38 | script.js        | Section 8 comment duplicated        | ✅ FIXED   |
| BUG-46 | assets/          | HKK-Client.svg unreferenced         | ✅ FIXED   |

### 🔒 Hold — Fix With Careers Backend

| Bug    | Page         | What                                            |
| ------ | ------------ | ----------------------------------------------- |
| BUG-33 | careers.html | App form: success shown on network error        |
| BUG-34 | careers.html | Internship form: success shown on network error |
| BUG-35 | careers.html | Both forms: no fetch timeout                    |
| BUG-60 | careers.html | applicantName computed but never used           |
| BUG-71 | careers.html | Phone: no format check                          |
| BUG-72 | careers.html | Name whitespace passes validation               |
| BUG-73 | careers.html | App button re-enables via success path only     |
| BUG-74 | careers.html | Internship same button issue                    |
| BUG-82 | careers.html | Email regex on untrimmed value                  |

---

_Total: 95 bugs | Fixed: 54 | Closed/not-a-bug/duplicate: 14 | Open: 27_
