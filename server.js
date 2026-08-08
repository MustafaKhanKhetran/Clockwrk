import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General limiter for authenticated client-portal traffic. The login limiter is
// far too tight for this: a single portal page load makes several calls, so
// mounting it on the whole router locked real clients out after two page loads.
const clientApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: 'Too many requests. Slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

import authRoutes from './routes/auth.js';
import statsRoutes from './routes/stats.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import requestsRoutes from './routes/requests.js';
import financeRoutes from './routes/finance.js';
import teamRoutes from './routes/team.js';
import bookingsRoutes from './routes/bookings.js';
import alertsRoutes from './routes/alerts.js';
import calendarRoutes from './routes/calendar.js';
import referralsRoutes from './routes/referrals.js';
import newsletterRoutes from './routes/newsletter.js';
import hrRoutes from './routes/hr.js';
import timeLogsRoutes from './routes/timeLogs.js';
import filesRoutes from './routes/files.js';
import communicationsRoutes from './routes/communications.js';
import dbRoutes from './routes/db.js';
import n8nRoutes from './routes/n8n.js';
import clientPortalRoutes from './routes/clientPortal.js';
import rateRoutes from './routes/rate.js';
import predictionsRoutes from './routes/predictions.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Cloudflare's proxy (required for rate limiting + X-Forwarded-For)
app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // Deny cleanly (no CORS headers -> browser blocks) instead of throwing,
    // which used to surface as a 500 on every preflight and look like an outage.
    console.warn(`CORS blocked origin: ${origin}`);
    cb(null, false);
  },
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/api/auth',           loginLimiter, authRoutes);
app.use('/api/stats',          statsRoutes);
app.use('/api/clients',        clientsRoutes);
app.use('/api/projects',       projectsRoutes);
app.use('/api/requests',       requestsRoutes);
app.use('/api/finance',        financeRoutes);
app.use('/api/team',           teamRoutes);
app.use('/api/bookings',       bookingsRoutes);
app.use('/api/alerts',         alertsRoutes);
app.use('/api/calendar',       calendarRoutes);
app.use('/api/referrals',      referralsRoutes);
app.use('/api/newsletter',     newsletterRoutes);
app.use('/api/hr',             hrRoutes);
app.use('/api/time-logs',      timeLogsRoutes);
app.use('/api/files',          filesRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/db',             dbRoutes);
app.use('/api/n8n',            n8nRoutes);
// Only the credential endpoints get the strict limiter; see clientPortal.js.
app.use('/api/client',        clientApiLimiter, clientPortalRoutes);
app.use('/api/rate',          rateRoutes);
app.use('/api/predictions',   predictionsRoutes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

import { startBookingAssignmentPoller } from './services/bookingAutoAssign.js';

app.listen(PORT, () => {
  console.log(`Clockwrk API running on http://localhost:${PORT}`);
  startBookingAssignmentPoller(60_000);
});
