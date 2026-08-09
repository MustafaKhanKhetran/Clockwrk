import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee, requireRoles } from "../middleware/auth";
import {
  autoAssignBooking,
  rebalanceAllBookings,
  sweepUnassignedBookings,
} from "../services/bookingAutoAssign";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const ACCESS = [
  "owner",
  "admin",
  "head_of_delivery",
  "project_manager",
  "account_manager",
  "sales",
];
app.get("/", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT b.*,e.name AS assignee_name FROM bookings b LEFT JOIN employees e ON e.id=b.assigned_to ORDER BY b.booking_date DESC,b.booking_time DESC",
  ).all();
  return c.json({ success: true, bookings: results });
});
app.post(
  "/auto-assign/sweep",
  requireEmployee,
  requireRoles("owner", "admin"),
  async (c) =>
    c.json({ success: true, updated: await sweepUnassignedBookings(c.env.DB) }),
);
app.post(
  "/auto-assign/rebalance",
  requireEmployee,
  requireRoles("owner", "admin"),
  async (c) =>
    c.json({ success: true, updated: await rebalanceAllBookings(c.env.DB) }),
);
app.get("/:id", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const booking = await c.env.DB.prepare(
    "SELECT b.*,e.name AS assignee_name,e.email AS assignee_email FROM bookings b LEFT JOIN employees e ON e.id=b.assigned_to WHERE b.id=?",
  )
    .bind(c.req.param("id"))
    .first();
  return booking
    ? c.json({ success: true, booking })
    : c.json({ success: false, message: "Booking not found" }, 404);
});
app.patch("/:id", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of [
    "status",
    "assigned_to",
    "notes",
    "booking_date",
    "booking_time",
  ])
    if (b[key] !== undefined) {
      fields.push(`${key}=?`);
      values.push(b[key]);
    }
  if (!fields.length)
    return c.json({ success: false, message: "No fields to update" }, 400);
  await c.env.DB.prepare(`UPDATE bookings SET ${fields.join(",")} WHERE id=?`)
    .bind(...values, c.req.param("id"))
    .run();
  return c.json({
    success: true,
    booking: await c.env.DB.prepare("SELECT * FROM bookings WHERE id=?")
      .bind(c.req.param("id"))
      .first(),
  });
});
app.post(
  "/:id/auto-assign",
  requireEmployee,
  requireRoles("owner", "admin", "head_of_delivery"),
  async (c) =>
    c.json({
      success: true,
      result: await autoAssignBooking(c.env.DB, c.req.param("id")),
    }),
);
export default app;
