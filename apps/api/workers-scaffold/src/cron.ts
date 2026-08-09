// Scheduled handlers.
//
//   * * * * *   — booking auto-assign sweep (every minute; matches the
//                 60s poller the Express version ran with setInterval)
//   0 */6 * * * — refresh payment predictions every six hours
//   0 3 * * *   — nightly D1 export → R2 backup (03:00 UTC)
//
// Cloudflare picks the trigger by `event.cron`, so we branch on that.

import type { Env } from './types';
import { sweepBookingAutoAssign } from './services/bookingAutoAssign';
import { runPredictionEngine } from './routes/predictions';

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  switch (event.cron) {
    case '* * * * *':
      ctx.waitUntil(sweepBookingAutoAssign(env).catch(err => console.error('booking sweep:', err)));
      return;
    case '0 */6 * * *':
      ctx.waitUntil(runPredictionEngine(env.DB).catch(err => console.error('prediction run:', err)));
      return;
    case '0 3 * * *':
      ctx.waitUntil(backupD1(env).catch(err => console.error('nightly backup:', err)));
      return;
  }
};

// Dumps every row of every user table to a single JSON blob in R2. Not the
// fanciest backup (no PITR), but it's off-box, dated, and D1 already keeps
// its own point-in-time restore — this is a second layer.
async function backupD1(env: Env) {
  const started = new Date();
  const { results: tables } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
  ).all<{ name: string }>();

  const dump: Record<string, unknown[]> = {};
  for (const { name } of tables) {
    const { results } = await env.DB.prepare(`SELECT * FROM "${name}"`).all();
    dump[name] = results;
  }

  const key = `backups/d1/${started.toISOString().slice(0, 10)}/clockwrk-${started.getTime()}.json`;
  await env.R2.put(key, JSON.stringify({ started_at: started.toISOString(), dump }), {
    httpMetadata: { contentType: 'application/json' },
  });
  console.log(`D1 backup written: ${key} (${tables.length} tables)`);
}
