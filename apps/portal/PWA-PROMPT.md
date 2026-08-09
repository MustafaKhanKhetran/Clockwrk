# Codex prompt — Make the portal installable (PWA) + mobile fixes

Turn `clockwrk-portal` into an installable PWA so clients can add it to their iPhone/Android home screen, and fix the mobile overflow bugs found while testing at 375px.

**No app store, no second codebase** — same React app, wrapped as a PWA.

---

## PART 1 — Icons (copy, don't design)

The dashboard already has a correctly branded CW icon set. Copy it in:

```bash
cp /Users/mustafakhetran/clockwrk-dashboard/public/assets/favicon/web-app-manifest-192x192.png \
   /Users/mustafakhetran/clockwrk-dashboard/public/assets/favicon/web-app-manifest-512x512.png \
   /Users/mustafakhetran/clockwrk-dashboard/public/assets/favicon/apple-touch-icon.png \
   /Users/mustafakhetran/clockwrk-dashboard/public/assets/favicon/favicon.ico \
   /Users/mustafakhetran/clockwrk-portal/public/
```

Then **replace** `public/favicon.svg` with the dashboard's version — the portal's current one is purple (`#863bff`), which is not the Clockwrk brand:

```bash
cp /Users/mustafakhetran/clockwrk-dashboard/public/assets/favicon/favicon.svg \
   /Users/mustafakhetran/clockwrk-portal/public/favicon.svg
```

---

## PART 2 — Manifest + meta

Install `vite-plugin-pwa` and configure it in `vite.config.js` with `registerType: 'prompt'` (not autoUpdate — we want to tell the user).

Manifest:
```js
{
  name: 'Clockwrk Client Portal',
  short_name: 'Clockwrk',
  description: 'Your projects, deliverables and billing with Clockwrk.',
  start_url: '/home',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#ffffff',
  background_color: '#ffffff',
  icons: [
    { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
```

Workbox: precache the built app shell; `NetworkFirst` for any `/api/` calls (harmless now on mocks, correct later).

In `index.html` — fix the title (currently literally `clockwrk-portal`) and add:
```html
<title>Clockwrk · Client Portal</title>
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Clockwrk" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

Add `viewport-fit=cover` to the existing viewport meta, and use `env(safe-area-inset-bottom)` padding on the mobile bottom nav so it clears the iPhone home indicator.

---

## PART 3 — Platform-aware install helper ⭐ the important bit

New component `src/components/InstallPrompt.jsx`, rendered from `Layout.jsx`.

**Android / desktop Chrome** — capture `beforeinstallprompt`, store the event, show a dismissible bar:
> **Install Clockwrk** — add it to your home screen for one-tap access.  `[ Install ]  [ Not now ]`

Clicking Install calls `.prompt()` on the stored event.

**iOS Safari** — there is **no install API**. Detect iOS + Safari + not already standalone, and show a slide-up sheet with illustrated steps:
> **Add Clockwrk to your home screen**
> 1. Tap the **Share** button `⎋` at the bottom of Safari
> 2. Scroll down and tap **Add to Home Screen**
> 3. Tap **Add**

Include a small arrow/pointer graphic aimed at the bottom bar where the Share button sits.

**In-app browsers (the common failure)** — if opened from WhatsApp, Instagram, LinkedIn, Gmail etc., "Add to Home Screen" isn't available and the client will give up. Detect via user-agent (`FBAN|FBAV|Instagram|Line|WhatsApp|LinkedIn|Twitter`) or iOS-WebView, and show instead:
> **Open in Safari to install**
> Tap `⋯` in the corner and choose **Open in Safari**.  `[ Copy link ]`

**Already installed** — if `window.matchMedia('(display-mode: standalone)').matches` or `navigator.standalone`, render nothing, ever.

**Timing and dismissal:**
- Do **not** show on first visit. Track visit count in `localStorage` and show from the **2nd** visit onward.
- "Not now" sets a `localStorage` flag suppressing it for 14 days.
- Never show more than once per session.

Put the detection in a small `src/utils/platform.js` — `isIOS()`, `isSafari()`, `isInAppBrowser()`, `isStandalone()` — so it's testable and reusable.

---

## PART 4 — Update toast

With `registerType: 'prompt'`, `vite-plugin-pwa` exposes `needRefresh`. When a new service worker is waiting, show a small toast:
> **New version available.**  `[ Reload ]`

Reload calls `updateServiceWorker(true)`. Reuse the existing toast/notification styling.

---

## PART 5 — Mobile overflow fixes

Measured at 375×812. The page itself does not scroll horizontally (good), but two containers overflow:

| Element | Content | Container |
|---|---|---|
| `.billing-included-stack` | 460px | 343px |
| `.main.portal-route` | 476px | 375px |

Fix by letting these wrap or scroll internally rather than pushing the layout. Also:

- The **"3 deliveries await approval"** carousel on Home clips card text (`Brand Systen`, `Delivered Jun 3`). Make it a proper horizontal scroll container with `scroll-snap`, visible partial next card, and no clipped text.
- The **bottom tab bar** has 8 icons with no labels — verify each tap target is **≥44×44px**. If they're tighter than that, drop to the 5 most-used (Home, Requests, Projects, Deliverables, Billing) and move the rest behind a "More" sheet.
- Check the new **retainer tier cards** and the **three-way pause modal** at 375px — both were built desktop-first and haven't been tested on mobile.

---

## Constraints

- One new dependency only: `vite-plugin-pwa`.
- Full-opacity colors — solid hex, no `rgba()` on surfaces, borders or fills. Shadows may keep alpha.
- Light and dark theme both work.
- Do not modify `mocks.js` or any pricing.
- Don't regress desktop — every mobile fix must be inside a media query or a non-breaking layout change.

## Verify

```bash
cd /Users/mustafakhetran/clockwrk-portal
npm install
npm run build
npm run preview     # service workers need a production build, not dev
```

Then at 375px check: no element overflows its container on Home, Billing, Requests · the install bar appears on the 2nd visit and not the 1st · "Not now" suppresses it · Lighthouse PWA audit passes installability. Confirm the manifest is served and the icons resolve.
