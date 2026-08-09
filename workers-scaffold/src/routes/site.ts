// /api/site — public marketing-site form endpoints (n8n replacement).
// Source: Express routes/publicSite.js + services/publicSiteEmails.js.
//
// Endpoints to port (all rate-limited 10/hour/IP):
//   POST /newsletter           (email → newsletter_subscribers + welcome email)
//   POST /booking              (form → bookings + Zoom meeting + internal alert + client confirm)
//   POST /careers              (form → careers alert)
//   POST /referral             (form → referrals)
//   POST /payment-confirm      (form → payments + dashboard alert + emails + optional referral entry)
//   GET  /jobs                 (public list — WHERE status='active')
//
// The Zoom OAuth flow used process.env.ZOOM_* — set those as Wrangler secrets
// (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET).

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ipRateLimit } from '../middleware/rateLimit';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const submitLimit = ipRateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'site-submit' });

app.get('/jobs', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, title, department, description, employment_type, location, created_at
       FROM job_listings WHERE status = 'active' ORDER BY created_at DESC`
  ).all();
  return c.json({ success: true, jobs: results });
});

// TODO: port /newsletter, /booking (incl. Zoom meeting creation), /careers,
// /referral, /payment-confirm. Reference the Express versions in
// routes/publicSite.js and services/publicSiteEmails.js for the exact
// insert shape + email templates.

app.post('/newsletter', submitLimit, async (c) => c.json({ success: false, message: 'Not yet ported' }, 501));
app.post('/booking', submitLimit, async (c) => c.json({ success: false, message: 'Not yet ported' }, 501));
app.post('/careers', submitLimit, async (c) => c.json({ success: false, message: 'Not yet ported' }, 501));
app.post('/referral', submitLimit, async (c) => c.json({ success: false, message: 'Not yet ported' }, 501));
app.post('/payment-confirm', submitLimit, async (c) => c.json({ success: false, message: 'Not yet ported' }, 501));

export default app;
