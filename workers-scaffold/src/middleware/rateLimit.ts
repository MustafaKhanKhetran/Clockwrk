// Lightweight in-Worker rate limiter using a Map. Adequate for per-IP
// throttling of low-volume endpoints (login, apply forms) on a single
// Worker isolate. For anything higher-volume or that needs to survive
// isolate churn, promote to Cloudflare's native Rate Limiting API or a
// Durable Object.

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function ipRateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    // CF-Connecting-IP is trustworthy on the Cloudflare edge — it's set by
    // the front-line proxy after evaluating any request-header spoofing.
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
    const key = `${opts.keyPrefix || ''}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    bucket.count++;
    if (bucket.count > opts.max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      return c.json(
        { success: false, message: 'Too many requests. Try again later.' },
        429,
        { 'Retry-After': String(retry) }
      );
    }
    return next();
  };
}
