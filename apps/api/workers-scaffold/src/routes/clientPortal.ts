// /api/client — the entire client-facing portal API. Skeleton.
// Source: Express routes/clientPortal.js (~1855 lines — the biggest single
// file). Every route here uses `requireClient` (not requireEmployee).
//
// **Cross-tenant safety is critical**: every query must filter by
// c.get('client')!.id — a client must never be able to see another client's
// projects/requests/messages/files. The Express version does this correctly
// throughout; preserve the pattern.
//
// Full route map (all under /api/client, all requireClient unless marked):
//
//   Auth:
//     POST /login                (public, credentialLimit)
//     GET  /me
//     PUT  /onboarding
//     PATCH /me                  (name, phone, company, avatar_url)
//     POST /change-password      (credentialLimit)
//     GET  /setup                (public, credentialLimit — verify invite token)
//     POST /setup/avatar         (public, credentialLimit, multipart)
//     POST /setup                (public, credentialLimit — completes onboarding + issues session)
//     POST /forgot-password      (public, credentialLimit)
//     POST /reset-password       (public, credentialLimit)
//
//   Overview:
//     GET  /dashboard            (counts, recent activity)
//
//   Projects:
//     GET    /projects
//     POST   /projects
//     GET    /projects/:id
//     PATCH  /projects/:id
//     POST   /projects/:id/links
//     DELETE /projects/:id/links/:linkId
//     POST   /projects/:id/resources
//     DELETE /projects/:id/resources/:resourceId
//
//   Invoices / billing:
//     GET  /invoices
//     GET  /billing/payment-details    (bank details from app_settings — server-only)
//     GET  /billing/summary
//     GET  /billing/quote              (?plan= or ?cadence=)
//     POST /billing/changes
//     POST /billing/changes/:id/reported
//     POST /billing/changes/:id/cancel
//
//   Tickets:
//     GET  /tickets
//     POST /tickets
//     GET  /tickets/:id
//     POST /tickets/:id/reply
//
//   Files:
//     GET /files
//
//   Messages (two-way with team):
//     GET  /messages
//     POST /messages             (accepts content and/or attachments)
//
//   Requests:
//     GET    /requests
//     POST   /requests           (accepts attachments; assigns queue_position atomically)
//     PUT    /requests/queue     (reorder client's queue)
//     GET    /requests/:id/breakdown
//     POST   /requests/:id/breakdown/approve
//     POST   /requests/:id/approve
//     POST   /requests/:id/revision
//     POST   /requests/:id/comments
//
//   Uploads:
//     POST /uploads              (multipart — clients/{id}/... path)
//
//   Notifications:
//     PUT /notifications         (update notify_prefs JSON)
//
//   Team contacts:
//     GET    /contacts
//     POST   /contacts
//     PATCH  /contacts/:id
//     DELETE /contacts/:id
//
//   Bookings (client-side scheduling):
//     GET  /bookings/availability
//     GET  /bookings
//     POST /bookings
//
// Notes for porting:
//   • Bank details in /billing/payment-details come from the app_settings
//     table; NEVER import them into the frontend bundle.
//   • Portal onboarding version tracking is on the clients row.
//   • `services/billingChanges` has PLANS, ADDONS, quote(), applyChange() etc.
//     — those are pure functions and port to Workers unchanged (no Node deps).

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireClient } from '../middleware/auth';
import { ipRateLimit } from '../middleware/rateLimit';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const credentialLimit = ipRateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'client-cred' });

// Client /me sanity endpoint so wrangler dev can be smoke-tested.
app.get('/me', requireClient, async (c) => {
  const client = c.get('client')!;
  const row = await c.env.DB.prepare(
    `SELECT id, name, email, phone, company, plan, billing, status, subscribed_at,
            next_payment_due, last_payment_date, notify_prefs,
            portal_onboarding_version, onboarding_completed_at
       FROM clients WHERE id = ?`
  ).bind(client.id).first();
  if (!row) return c.json({ success: false, message: 'Client not found' }, 404);
  return c.json({ success: true, client: row });
});

// TODO: port everything above from Express routes/clientPortal.js.

export default app;
