import { Router } from 'express';

const router = Router();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 275.62;

// Free, no-key public APIs tried in order
const RATE_SOURCES = [
  () => fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) })
    .then(r => r.json()).then(d => { if (!d.rates?.PKR) throw new Error('no PKR'); return d.rates.PKR; }),
  () => fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(8000) })
    .then(r => r.json()).then(d => { if (!d.rates?.PKR) throw new Error('no PKR'); return d.rates.PKR; }),
];

let cache = { rate: null, fetchedAt: null };

async function fetchRate() {
  for (const source of RATE_SOURCES) {
    try {
      const rate = await source();
      if (rate && rate > 100 && rate < 1000) return parseFloat(rate.toFixed(2));
    } catch {}
  }
  throw new Error('All rate sources failed');
}

// GET /api/rate/usd-pkr
router.get('/usd-pkr', async (req, res) => {
  try {
    const now = Date.now();
    const cacheValid = cache.rate && cache.fetchedAt && (now - cache.fetchedAt) < CACHE_TTL_MS;

    if (cacheValid) {
      return res.json({ success: true, rate: cache.rate, fetchedAt: cache.fetchedAt, cached: true });
    }

    const rate = await fetchRate();
    cache = { rate, fetchedAt: now };

    return res.json({ success: true, rate, fetchedAt: now, cached: false });
  } catch (err) {
    console.error('[rate scraper]', err.message);
    // Return stale cache if we have it rather than failing completely
    if (cache.rate) {
      return res.json({ success: true, rate: cache.rate, fetchedAt: cache.fetchedAt, cached: true, stale: true, warning: err.message });
    }
    // Hard fallback so dashboard never breaks
    return res.json({ success: true, rate: FALLBACK_RATE, fetchedAt: Date.now(), cached: false, stale: true, warning: 'Using fallback rate — all sources failed' });
  }
});

export default router;
