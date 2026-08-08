import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [bookings] = await db.execute(
      `SELECT b.id, 'booking' AS event_type, b.is_internal,
        (SELECT p.name FROM projects p JOIN clients c2 ON c2.id = p.client_id
         WHERE c2.email = b.email AND p.status='active'
         ORDER BY p.priority='urgent' DESC, p.priority='high' DESC, p.start_date DESC, p.id DESC LIMIT 1) AS project_name,
        CASE
          WHEN b.is_internal = 1 THEN
            COALESCE(NULLIF(b.notes,''), 'Team Meeting')
          WHEN (SELECT 1 FROM projects p JOIN clients c2 ON c2.id = p.client_id
                WHERE c2.email = b.email AND p.status='active' LIMIT 1) IS NOT NULL THEN
            CONCAT(
              (SELECT p.name FROM projects p JOIN clients c2 ON c2.id = p.client_id
               WHERE c2.email = b.email AND p.status='active'
               ORDER BY p.priority='urgent' DESC, p.priority='high' DESC, p.start_date DESC, p.id DESC LIMIT 1),
              ': ',
              COALESCE(NULLIF(b.notes,''), 'Project Meeting')
            )
          ELSE
            CONCAT(b.name, ' — Discovery Call')
        END AS title,
        b.name AS client_name, b.email AS client_email, b.company, b.client_role, b.guests AS guests_raw,
        b.booking_date AS event_date, b.booking_time AS event_time, b.zoom_link, b.status,
        b.assigned_to, e.name AS assignee_name, e.role AS assignee_role, e.avatar_url AS assignee_avatar_url, e.email AS assignee_email,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'id', em.id, 'name', em.name, 'role', em.role,
            'avatar_url', em.avatar_url, 'email', em.email,
            'role_in_meeting', ids.role_in_meeting,
            'is_lead', em.id = b.assigned_to
          ))
          FROM (
            SELECT b.assigned_to AS emp_id, NULL AS role_in_meeting
            WHERE b.assigned_to IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM booking_attendees ba2 WHERE ba2.booking_id = b.id AND ba2.employee_id = b.assigned_to)
            UNION
            SELECT ba.employee_id, ba.role_in_meeting FROM booking_attendees ba WHERE ba.booking_id = b.id
          ) ids
          JOIN employees em ON em.id = ids.emp_id
        ) AS attendees_raw
       FROM bookings b
       LEFT JOIN employees e ON e.id = b.assigned_to
       WHERE b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         AND b.booking_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
       ORDER BY b.booking_date, b.booking_time`
    );

    const today = new Date().toISOString().slice(0, 10);
    const all = [...bookings];

    // Normalise event_date to YYYY-MM-DD — MySQL DATE columns come back as JS Date objects
    const toISO = d => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      // Already a string — if it looks like ISO keep it, otherwise try parsing
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const parsed = new Date(s);
      return isNaN(parsed) ? null : parsed.toISOString().slice(0, 10);
    };

    const parseAttendees = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try { return JSON.parse(raw); } catch { return []; }
    };

    const titleCase = (s) => s.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const parseGuests = (raw, primaryName, primaryEmail, primaryRole) => {
      let extra = [];
      if (raw) {
        if (Array.isArray(raw)) extra = raw;
        else { try { extra = JSON.parse(raw); } catch { extra = []; } }
      }
      const guests = (extra || []).map(g => {
        if (typeof g === 'string') {
          const email = g.trim();
          const local = email.split('@')[0] || email;
          return { email, name: titleCase(local), role: 'guest', is_primary: false };
        }
        return {
          email: g.email || '',
          name: g.name || titleCase((g.email || '').split('@')[0] || ''),
          role: g.role || 'guest',
          is_primary: false,
        };
      }).filter(g => g.email || g.name);

      const primary = (primaryEmail || primaryName)
        ? [{
            email: primaryEmail || '',
            name: primaryName || primaryEmail,
            role: primaryRole || 'owner',
            is_primary: true,
          }]
        : [];
      return [...primary, ...guests];
    };

    const normalised = all.map(e => ({
      ...e,
      event_date: toISO(e.event_date),
      attendees: parseAttendees(e.attendees_raw),
      client_attendees: e.event_type === 'booking' && !e.is_internal
        ? parseGuests(e.guests_raw, e.client_name, e.client_email, e.client_role)
        : [],
      attendees_raw: undefined,
      guests_raw: undefined,
    }));

    const todayEvents = normalised.filter(e => e.event_date === today);

    // Build events_by_date map { 'YYYY-MM-DD': [event, ...] }
    const events_by_date = {};
    for (const e of normalised) {
      if (!e.event_date) continue;
      if (!events_by_date[e.event_date]) events_by_date[e.event_date] = [];
      events_by_date[e.event_date].push(e);
    }

    return res.json({ success: true, events: normalised, today: todayEvents, events_by_date });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
