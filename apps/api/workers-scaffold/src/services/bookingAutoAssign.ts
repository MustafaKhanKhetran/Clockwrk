// Booking auto-assignment sweep. Ported skeleton.
// Source: Express services/bookingAutoAssign.js (~147 lines).
//
// Runs from src/cron.ts on the '* * * * *' schedule (every minute).
// Picks unassigned bookings and assigns them to the least-loaded eligible
// employee, respecting role + department + max_capacity.

import type { Env } from '../types';

export async function sweepBookingAutoAssign(env: Env): Promise<{ updated: number }> {
  // TODO: port autoAssignBooking + sweepUnassignedBookings from
  // Express services/bookingAutoAssign.js. Should be a straight port —
  // the source uses plain mysql queries; swap for env.DB.prepare(...).
  const { results } = await env.DB.prepare(
    "SELECT id FROM bookings WHERE assigned_to IS NULL AND status = 'confirmed' LIMIT 25"
  ).all<{ id: number }>();
  // For each booking: query eligible employees, pick lowest-load, UPDATE.
  return { updated: results.length };
}
