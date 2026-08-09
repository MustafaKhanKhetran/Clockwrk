// /api/newsletter — subscriber list. Fully ported.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const COMMS_ACCESS = ['owner', 'admin', 'marketing_manager', 'seo_specialist', 'social_media_manager', 'content_writer'];

app.get('/', requireEmployee, requireRoles(...COMMS_ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC'
  ).all();
  return c.json({ success: true, subscribers: results });
});

app.patch('/:id/unsubscribe', requireEmployee, requireRoles(...COMMS_ACCESS), async (c) => {
  await c.env.DB.prepare(
    `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(c.req.param('id')).run();
  return c.json({ success: true });
});

export default app;
