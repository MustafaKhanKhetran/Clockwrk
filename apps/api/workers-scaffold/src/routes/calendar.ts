import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee } from "../middleware/auth";
import { parseJson } from "../lib/db";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const titleCase = (value: string) =>
  value.replace(/[._-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
function clientAttendees(
  raw: unknown,
  name: unknown,
  email: unknown,
  role: unknown,
) {
  const parsed = parseJson<unknown[]>(raw, []);
  const extras = parsed
    .map((item) => {
      if (typeof item === "string") {
        const local = item.split("@")[0] || item;
        return {
          email: item.trim(),
          name: titleCase(local),
          role: "guest",
          is_primary: false,
        };
      }
      const guest = (item || {}) as Record<string, unknown>;
      return {
        email: String(guest.email || ""),
        name: String(
          guest.name ||
            titleCase(String(guest.email || "").split("@")[0] || ""),
        ),
        role: String(guest.role || "guest"),
        is_primary: false,
      };
    })
    .filter((item) => item.email || item.name);
  return email || name
    ? [
        {
          email: String(email || ""),
          name: String(name || email),
          role: String(role || "owner"),
          is_primary: true,
        },
        ...extras,
      ]
    : extras;
}
app.get("/", requireEmployee, async (c) => {
  const [bookings, requestDates, projectDates, paymentDates] =
    await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT b.id,'booking' AS event_type,b.is_internal,(SELECT p.name FROM projects p JOIN clients c2 ON c2.id=p.client_id WHERE c2.email=b.email AND p.status='active' ORDER BY CASE p.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,p.start_date DESC,p.id DESC LIMIT 1) AS project_name,CASE WHEN b.is_internal=1 THEN COALESCE(NULLIF(b.notes,''),'Team Meeting') WHEN EXISTS(SELECT 1 FROM projects p JOIN clients c2 ON c2.id=p.client_id WHERE c2.email=b.email AND p.status='active') THEN (SELECT p.name FROM projects p JOIN clients c2 ON c2.id=p.client_id WHERE c2.email=b.email AND p.status='active' ORDER BY CASE p.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,p.start_date DESC,p.id DESC LIMIT 1)||': '||COALESCE(NULLIF(b.notes,''),'Project Meeting') ELSE b.name||' — Discovery Call' END AS title,b.name AS client_name,b.email AS client_email,b.company,b.client_role,b.guests AS guests_raw,b.booking_date AS event_date,b.booking_time AS event_time,b.zoom_link,b.status,b.assigned_to,e.name AS assignee_name,e.role AS assignee_role,e.avatar_url AS assignee_avatar_url,e.email AS assignee_email,(SELECT json_group_array(json_object('id',people.id,'name',people.name,'role',people.role,'avatar_url',people.avatar_url,'email',people.email,'role_in_meeting',people.role_in_meeting,'is_lead',people.id=b.assigned_to)) FROM (SELECT em.id,em.name,em.role,em.avatar_url,em.email,ba.role_in_meeting FROM booking_attendees ba JOIN employees em ON em.id=ba.employee_id WHERE ba.booking_id=b.id UNION SELECT em.id,em.name,em.role,em.avatar_url,em.email,NULL FROM employees em WHERE em.id=b.assigned_to AND NOT EXISTS(SELECT 1 FROM booking_attendees ba WHERE ba.booking_id=b.id AND ba.employee_id=b.assigned_to)) people) AS attendees_raw FROM bookings b LEFT JOIN employees e ON e.id=b.assigned_to WHERE date(b.booking_date) BETWEEN date('now','-7 days') AND date('now','+60 days') ORDER BY b.booking_date,b.booking_time`,
      ),
      c.env.DB.prepare(
        "SELECT r.id,'request_due' AS event_type,r.title,p.name AS project_name,c.company,r.due_date AS event_date,NULL AS event_time,r.status,r.assigned_to,e.name AS assignee_name FROM requests r JOIN projects p ON p.id=r.project_id JOIN clients c ON c.id=r.client_id LEFT JOIN employees e ON e.id=r.assigned_to WHERE date(r.due_date) BETWEEN date('now','-30 days') AND date('now','+90 days') AND r.request_kind!='parent'",
      ),
      c.env.DB.prepare(
        "SELECT p.id,'project_due' AS event_type,p.name AS title,p.name AS project_name,c.company,p.due_date AS event_date,NULL AS event_time,p.status,p.project_manager_id AS assigned_to,e.name AS assignee_name FROM projects p JOIN clients c ON c.id=p.client_id LEFT JOIN employees e ON e.id=p.project_manager_id WHERE date(p.due_date) BETWEEN date('now','-30 days') AND date('now','+90 days')",
      ),
      c.env.DB.prepare(
        "SELECT c.id,'payment_due' AS event_type,c.company||' payment due' AS title,NULL AS project_name,c.company,c.next_payment_due AS event_date,NULL AS event_time,c.status,NULL AS assigned_to,NULL AS assignee_name FROM clients c WHERE date(c.next_payment_due) BETWEEN date('now','-30 days') AND date('now','+90 days')",
      ),
    ]);
  const all = [
    ...(bookings?.results ?? []),
    ...(requestDates?.results ?? []),
    ...(projectDates?.results ?? []),
    ...(paymentDates?.results ?? []),
  ].map((row) => {
    const event = { ...(row as Record<string, unknown>) };
    event.event_date = event.event_date
      ? String(event.event_date).slice(0, 10)
      : null;
    event.attendees = parseJson(event.attendees_raw, []);
    event.client_attendees =
      event.event_type === "booking" && !event.is_internal
        ? clientAttendees(
            event.guests_raw,
            event.client_name,
            event.client_email,
            event.client_role,
          )
        : [];
    delete event.attendees_raw;
    delete event.guests_raw;
    return event;
  });
  const today = new Date().toISOString().slice(0, 10);
  const eventsByDate: Record<string, Record<string, unknown>[]> =
    Object.create(null);
  for (const event of all) {
    const date = String(event.event_date || "");
    if (date) (eventsByDate[date] ??= []).push(event);
  }
  return c.json({
    success: true,
    events: all,
    today: all.filter((event) => event.event_date === today),
    events_by_date: eventsByDate,
  });
});
export default app;
