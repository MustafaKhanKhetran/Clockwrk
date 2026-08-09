import type { Env } from "../types";

export async function pickAccountManager(db: D1Database) {
  return (
    (
      await db
        .prepare(
          `SELECT e.id,(SELECT COUNT(DISTINCT a.entity_id) FROM assignments a JOIN clients c ON c.id=a.entity_id WHERE a.entity_type='client' AND a.employee_id=e.id AND c.status='active') AS active_client_count,(SELECT COUNT(*) FROM bookings b WHERE b.assigned_to=e.id AND date(b.booking_date) BETWEEN date('now') AND date('now','+14 days') AND b.status IN ('confirmed','pending')) AS upcoming_bookings,(SELECT COUNT(*) FROM requests r WHERE r.assigned_to=e.id AND r.status!='completed' AND r.request_kind!='parent') AS open_requests FROM employees e WHERE e.status='active' AND e.role='account_manager' ORDER BY (active_client_count+upcoming_bookings),open_requests,e.id LIMIT 1`,
        )
        .first<{ id: number }>()
    )?.id ?? null
  );
}
export async function pickClientPM(db: D1Database, clientId: number) {
  return (
    (
      await db
        .prepare(
          `SELECT a.employee_id FROM assignments a JOIN employees e ON e.id=a.employee_id WHERE a.entity_type='client' AND a.entity_id=? AND a.subtype='lead' AND e.role='project_manager' AND e.status='active' ORDER BY a.created_at DESC LIMIT 1`,
        )
        .bind(clientId)
        .first<{ employee_id: number }>()
    )?.employee_id ?? null
  );
}
export async function autoAssignBooking(
  db: D1Database,
  bookingId: string,
  { overwrite = false }: { overwrite?: boolean } = {},
) {
  const booking = await db
    .prepare("SELECT id,email,assigned_to FROM bookings WHERE id=?")
    .bind(bookingId)
    .first<{ id: string; email: string | null; assigned_to: number | null }>();
  if (!booking || (booking.assigned_to && !overwrite)) return null;
  let employeeId: number | null = null;
  let reason = "discovery_call";
  if (booking.email) {
    const client = await db
      .prepare("SELECT id FROM clients WHERE email=? LIMIT 1")
      .bind(booking.email)
      .first<{ id: number }>();
    if (client) {
      employeeId = await pickClientPM(db, client.id);
      reason = employeeId ? "existing_client_pm" : "existing_client_no_pm";
    }
  }
  if (!employeeId) employeeId = await pickAccountManager(db);
  if (!employeeId) return null;
  await db
    .prepare("UPDATE bookings SET assigned_to=? WHERE id=?")
    .bind(employeeId, bookingId)
    .run();
  return { booking_id: bookingId, employee_id: employeeId, reason };
}
export async function sweepUnassignedBookings(db: D1Database) {
  const rows = (
    await db
      .prepare(
        "SELECT id FROM bookings WHERE assigned_to IS NULL AND is_internal=0 AND date(booking_date)>=date('now','-7 days') AND status IN ('confirmed','pending')",
      )
      .all<{ id: string }>()
  ).results;
  let updated = 0;
  for (const row of rows) if (await autoAssignBooking(db, row.id)) updated += 1;
  return updated;
}
export async function rebalanceAllBookings(db: D1Database) {
  const rows = (
    await db.prepare("SELECT id FROM bookings").all<{ id: string }>()
  ).results;
  let updated = 0;
  for (const row of rows)
    if (await autoAssignBooking(db, row.id, { overwrite: true })) updated += 1;
  return updated;
}
export async function sweepBookingAutoAssign(env: Env) {
  return sweepUnassignedBookings(env.DB);
}
