// Clockwrk API on Cloudflare Workers.
// Mounts every route group under the same URLs the Express version served,
// so the dashboard + portal need zero URL changes at cutover.
//
// This file also owns the cross-cutting concerns: CORS, security headers,
// structured 5xx handling, health check.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Env, Variables } from './types';

import authRoutes from './routes/auth';
import alertsRoutes from './routes/alerts';
import clientsRoutes from './routes/clients';
import projectsRoutes from './routes/projects';
import requestsRoutes from './routes/requests';
import financeRoutes from './routes/finance';
import teamRoutes from './routes/team';
import bookingsRoutes from './routes/bookings';
import calendarRoutes from './routes/calendar';
import referralsRoutes from './routes/referrals';
import newsletterRoutes from './routes/newsletter';
import hrRoutes from './routes/hr';
import timeLogsRoutes from './routes/timeLogs';
import filesRoutes from './routes/files';
import communicationsRoutes from './routes/communications';
import dbRoutes from './routes/db';
import clientPortalRoutes from './routes/clientPortal';
import rateRoutes from './routes/rate';
import predictionsRoutes from './routes/predictions';
import statsRoutes from './routes/stats';
import siteRoutes from './routes/site';
import { scheduled } from './cron';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Middleware ──────────────────────────────────────────────────────
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'no-referrer',
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginEmbedderPolicy: false,
}));

app.use('*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  const cors_ = cors({
    origin: (origin) => allowed.includes(origin) ? origin : '',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Retry-After'],
    maxAge: 600,
  });
  return cors_(c, next);
});

// Never leak the underlying error message to callers — log the real thing,
// return a generic 500. Downstream handlers use c.json({ success: false }).
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, message: 'Server error' }, 500);
});

app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Routes ──────────────────────────────────────────────────────────
app.route('/api/auth',           authRoutes);
app.route('/api/stats',          statsRoutes);
app.route('/api/clients',        clientsRoutes);
app.route('/api/projects',       projectsRoutes);
app.route('/api/requests',       requestsRoutes);
app.route('/api/finance',        financeRoutes);
app.route('/api/team',           teamRoutes);
app.route('/api/bookings',       bookingsRoutes);
app.route('/api/alerts',         alertsRoutes);
app.route('/api/calendar',       calendarRoutes);
app.route('/api/referrals',      referralsRoutes);
app.route('/api/newsletter',     newsletterRoutes);
app.route('/api/hr',             hrRoutes);
app.route('/api/time-logs',      timeLogsRoutes);
app.route('/api/files',          filesRoutes);
app.route('/api/communications', communicationsRoutes);
app.route('/api/db',             dbRoutes);
app.route('/api/client',         clientPortalRoutes);
app.route('/api/rate',           rateRoutes);
app.route('/api/predictions',    predictionsRoutes);
app.route('/api/site',           siteRoutes);

// ─── Fetch + Scheduled ───────────────────────────────────────────────
export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Env>;
