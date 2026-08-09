// /api/rate — USD/PKR exchange rate scraper with 1-hour cache. Fully ported.
// Source: Express routes/rate.js. Cache is per-isolate (Map) — good enough
// for hot rate lookups; if you need it shared across isolates promote to KV.

import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_RATE = 275.62;
let cache: { rate: number | null; fetchedAt: number | null } = { rate: null, fetchedAt: null };

const SOURCES = [
  async () => {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
    const d = await r.json() as { rates?: { PKR?: number } };
    if (!d.rates?.PKR) throw new Error('no PKR');
    return d.rates.PKR;
  },
  async () => {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(8000) });
    const d = await r.json() as { rates?: { PKR?: number } };
    if (!d.rates?.PKR) throw new Error('no PKR');
    return d.rates.PKR;
  },
];

async function fetchRate() {
  for (const source of SOURCES) {
    try {
      const rate = await source();
      if (rate && rate > 100 && rate < 1000) return Number(rate.toFixed(2));
    } catch { /* try next */ }
  }
  throw new Error('All rate sources failed');
}

app.get('/usd-pkr', async (c) => {
  const now = Date.now();
  const fresh = cache.rate && cache.fetchedAt && (now - cache.fetchedAt) < CACHE_TTL_MS;
  if (fresh) return c.json({ success: true, rate: cache.rate, fetchedAt: cache.fetchedAt, cached: true });
  try {
    const rate = await fetchRate();
    cache = { rate, fetchedAt: now };
    return c.json({ success: true, rate, fetchedAt: now, cached: false });
  } catch (err) {
    if (cache.rate) {
      return c.json({ success: true, rate: cache.rate, fetchedAt: cache.fetchedAt, cached: true, stale: true, warning: (err as Error).message });
    }
    return c.json({ success: true, rate: FALLBACK_RATE, fetchedAt: Date.now(), cached: false, stale: true, warning: 'Using fallback rate — all sources failed' });
  }
});

export default app;
