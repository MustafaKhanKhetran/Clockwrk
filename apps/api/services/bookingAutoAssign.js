import db from '../db.js';

/**
 * Pick the active account_manager with the fewest currently-assigned active clients.
 * Tie-break: fewest open requests, then lowest id.
 * Returns the employee_id, or null if no eligible AMs.
 */
export async function pickAccountManager() {
  const [rows] = await db.execute(`
    SELECT
      e.id,
      (
        SELECT COUNT(DISTINCT a.entity_id)
        FROM assignments a
        JOIN clients c ON c.id = a.entity_id
        WHERE a.entity_type = 'client'
          AND a.employee_id = e.id
          AND c.status = 'active'
      ) AS active_client_count,
      (
        SELECT COUNT(*) FROM bookings b
        WHERE b.assigned_to = e.id
          AND b.booking_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
          AND b.status IN ('confirmed','pending')
      ) AS upcoming_bookings,
      (
        SELECT COUNT(*) FROM requests r
        WHERE r.assigned_to = e.id AND r.status != 'completed' AND r.request_kind != 'parent'
      ) AS open_requests
    FROM employees e
    WHERE e.status = 'active'
      AND e.role = 'account_manager'
    ORDER BY (active_client_count + upcoming_bookings) ASC, open_requests ASC, e.id ASC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

/**
 * Find the PM (project_manager) who leads a given client, via the
 * `assignments` table (entity_type='client', subtype='lead'). Returns
 * the employee_id of the PM, or null if no PM lead is set.
 */
export async function pickClientPM(clientId) {
  const [rows] = await db.execute(`
    SELECT a.employee_id
    FROM assignments a
    JOIN employees e ON e.id = a.employee_id
    WHERE a.entity_type = 'client'
      AND a.entity_id = ?
      AND a.subtype = 'lead'
      AND e.role = 'project_manager'
      AND e.status = 'active'
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [clientId]);
  return rows[0]?.employee_id ?? null;
}

/**
 * Assign one specific booking. If the booking email matches an existing
 * client → assign their PM (or AM if no PM lead). Otherwise → AM with
 * fewest active clients. Always overwrites the existing assigned_to so
 * this works for rebalancing too.
 *
 * Returns { booking_id, employee_id, reason } on success, or null if no
 * eligible assignee could be picked.
 */
export async function autoAssignBooking(bookingId, { overwrite = false } = {}) {
  const [[booking]] = await db.execute(
    'SELECT id, email, assigned_to FROM bookings WHERE id = ?',
    [bookingId]
  );
  if (!booking) return null;
  if (booking.assigned_to && !overwrite) return null;

  let employeeId = null;
  let reason = 'discovery_call';

  if (booking.email) {
    const [[client]] = await db.execute(
      'SELECT id FROM clients WHERE email = ? LIMIT 1',
      [booking.email]
    );
    if (client) {
      const pmId = await pickClientPM(client.id);
      if (pmId) {
        employeeId = pmId;
        reason = 'existing_client_pm';
      } else {
        reason = 'existing_client_no_pm';
      }
    }
  }

  if (!employeeId) {
    employeeId = await pickAccountManager();
  }
  if (!employeeId) return null;

  await db.execute(
    'UPDATE bookings SET assigned_to = ? WHERE id = ?',
    [employeeId, bookingId]
  );
  return { booking_id: bookingId, employee_id: employeeId, reason };
}

/**
 * Find every NULL-assignee booking and assign one each.
 * Returns the count of bookings updated.
 */
export async function sweepUnassignedBookings() {
  const [rows] = await db.execute(
    "SELECT id FROM bookings WHERE assigned_to IS NULL AND is_internal = 0 AND booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status IN ('confirmed','pending')"
  );
  let updated = 0;
  for (const row of rows) {
    const result = await autoAssignBooking(row.id);
    if (result) updated += 1;
  }
  return updated;
}

/**
 * Reassign every booking under the current rule, even if already assigned.
 * Returns count of bookings updated.
 */
export async function rebalanceAllBookings() {
  const [rows] = await db.execute('SELECT id FROM bookings');
  let updated = 0;
  for (const row of rows) {
    const result = await autoAssignBooking(row.id, { overwrite: true });
    if (result) updated += 1;
  }
  return updated;
}

let timer = null;

export function startBookingAssignmentPoller(intervalMs = 60_000) {
  if (timer) return;
  timer = setInterval(() => {
    sweepUnassignedBookings().catch(err => console.error('booking auto-assign sweep failed', err));
  }, intervalMs);
  // run once on boot too
  sweepUnassignedBookings().catch(err => console.error('booking auto-assign initial sweep failed', err));
}
