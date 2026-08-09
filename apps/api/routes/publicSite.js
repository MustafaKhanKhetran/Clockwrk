import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import {
  sendBookingEmails,
  sendCareersApplicationAlert,
  sendNewsletterWelcome,
  sendPaymentEmails,
} from '../services/publicSiteEmails.js';

const router = Router();

// Mirrors the public HR application limit: each form submission endpoint gets
// the same per-IP budget, while read-only job/slot discovery stays available.
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submissions from this address. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const health = (res, workflow, { includeDb = false, includeTimestamp = false } = {}) => res.json({
  status: 'ok',
  workflow,
  ...(includeDb ? { db: 'ok' } : {}),
  ...(includeTimestamp ? { ts: new Date().toISOString() } : {}),
});

const safeDate = value => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
};

const createZoomMeeting = async booking => {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom Server-to-Server OAuth is not configured');
  }

  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
      },
    }
  );
  if (!tokenResponse.ok) throw new Error(`Zoom token request failed (${tokenResponse.status})`);
  const { access_token: accessToken } = await tokenResponse.json();

  const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: `Discovery Call — ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
      type: 2,
      start_time: new Date(`${booking.booking_date}T${booking.booking_time}:00`).toISOString(),
      duration: 30,
      timezone: 'Asia/Karachi',
      settings: { host_video: true, participant_video: true, waiting_room: true },
    }),
  });
  if (!meetingResponse.ok) throw new Error(`Zoom meeting creation failed (${meetingResponse.status})`);
  return meetingResponse.json();
};

const findBookingAssignee = async email => {
  const [[assignee]] = await db.execute(
    `SELECT id, name, email FROM employees WHERE id = COALESCE(
      (
        SELECT a.employee_id
        FROM clients c
        JOIN assignments a ON a.entity_type = 'client' AND a.entity_id = c.id AND a.subtype = 'lead'
        JOIN employees e ON e.id = a.employee_id
        WHERE c.email = ? AND e.role = 'project_manager' AND e.status = 'active'
        ORDER BY a.created_at DESC LIMIT 1
      ),
      (
        SELECT e.id FROM employees e
        WHERE e.role = 'account_manager' AND e.status = 'active'
        ORDER BY
          ((SELECT COUNT(DISTINCT a.entity_id) FROM assignments a JOIN clients c ON c.id = a.entity_id
            WHERE a.entity_type = 'client' AND a.employee_id = e.id AND c.status = 'active')
          + (SELECT COUNT(*) FROM bookings b WHERE b.assigned_to = e.id
            AND b.booking_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
            AND b.status IN ('confirmed','pending'))) ASC,
          (SELECT COUNT(*) FROM requests r WHERE r.assigned_to = e.id AND r.status != 'completed') ASC,
          e.id ASC LIMIT 1
      )
    )`,
    [email]
  );
  return assignee || null;
};

// POST /api/site/newsletter — workflow 2vMWtrUSPenv8ehL
router.post('/newsletter', submissionLimiter, async (req, res, next) => {
  if (req.body?.healthcheck === true) {
    return health(res, 'site-newsletter', { includeDb: true, includeTimestamp: true });
  }

  try {
    if (!req.body?.email) return res.status(400).json({ success: false, message: 'Missing email' });
    const email = req.body.email.trim().toLowerCase();
    if (!emailPattern.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
    const type = req.body.type || 'marketing';
    if (!['marketing', 'careers'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    const [[existing]] = await db.execute(
      'SELECT id FROM newsletter_subscribers WHERE email = ? AND type = ? LIMIT 1',
      [email, type]
    );
    if (existing) return res.json({ success: true, message: 'already_subscribed' });

    await db.execute(
      'INSERT INTO newsletter_subscribers (email, type, source) VALUES (?, ?, ?)',
      [email, type, req.body.source || 'footer']
    );
    await sendNewsletterWelcome({ email, type });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// GET /api/site/slots — the second public webhook contained in workflow 49tZKYOFg4ZxpNip.
router.get('/slots', async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number.parseInt(req.query.year, 10) || now.getFullYear();
    const month = Number.parseInt(req.query.month, 10) || now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slots = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month - 1, day);
      if ([0, 6].includes(date.getDay()) || date < today) continue;
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      slots[key] = Array.from({ length: 18 }, (_, index) => {
        const hour = 9 + Math.floor(index / 2);
        return `${String(hour).padStart(2, '0')}:${index % 2 ? '30' : '00'}`;
      });
    }

    const [booked] = await db.execute(
      "SELECT booking_date, booking_time FROM bookings WHERE status = 'confirmed' AND booking_date >= CURDATE()"
    );
    const occupied = new Set(booked.map(row => {
      const date = row.booking_date instanceof Date
        ? `${row.booking_date.getFullYear()}-${String(row.booking_date.getMonth() + 1).padStart(2, '0')}-${String(row.booking_date.getDate()).padStart(2, '0')}`
        : String(row.booking_date).split(/[T ]/)[0];
      return `${date}|${row.booking_time}`;
    }));

    const available = Object.fromEntries(Object.entries(slots)
      .map(([date, times]) => [date, times.filter(time => !occupied.has(`${date}|${time}`))])
      .filter(([, times]) => times.length));
    return res.json({ slots: available });
  } catch (err) {
    return next(err);
  }
});

// POST /api/site/booking — workflow 49tZKYOFg4ZxpNip
router.post('/booking', submissionLimiter, async (req, res, next) => {
  if (req.body?.healthcheck === true) {
    return health(res, 'site-booking', { includeDb: true, includeTimestamp: true });
  }

  try {
    const body = req.body || {};
    if (!body.name || !body.email || !body.date || !body.time) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, email, date, time' });
    }
    if (!emailPattern.test(body.email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    const guests = (body.guests || []).map(guest => {
      if (typeof guest === 'string') {
        return {
          email: guest,
          name: guest.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
          role: 'guest',
        };
      }
      return {
        email: guest.email || '',
        name: guest.name || (guest.email || '').split('@')[0],
        role: guest.role || 'guest',
      };
    }).filter(guest => guest.email);
    const booking = {
      id: randomUUID(),
      name: body.name,
      email: body.email,
      company: body.company || '',
      client_role: body.client_role || body.role || 'owner',
      services: body.services || '',
      notes: body.notes || '',
      guests: JSON.stringify(guests),
      booking_date: body.date,
      booking_time: body.time,
      status: 'confirmed',
    };

    const [[taken]] = await db.execute(
      "SELECT id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status = 'confirmed' LIMIT 1",
      [booking.booking_date, booking.booking_time]
    );
    if (taken) {
      return res.json({
        success: false,
        error: 'This time slot is already booked. Please choose another time.',
      });
    }

    const assignee = await findBookingAssignee(booking.email);
    const zoom = await createZoomMeeting(booking);
    await db.execute(
      `INSERT INTO bookings
        (id, name, email, company, services, notes, guests, booking_date, booking_time,
         zoom_link, zoom_meeting_id, status, assigned_to, client_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [
        booking.id, booking.name, booking.email, booking.company, booking.services,
        booking.notes, booking.guests, booking.booking_date, booking.booking_time,
        zoom.join_url, String(zoom.id), assignee?.id || null, booking.client_role,
      ]
    );
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link)
       VALUES ('booking', 'New booking received', ?, '/bookings')`,
      [`${booking.name}${booking.company ? ` (${booking.company})` : ''} booked a call for ${booking.booking_date} at ${booking.booking_time} — assigned to ${assignee?.name || 'Mustafa Khan'}`]
    );
    await sendBookingEmails({ booking, zoom, assignee });
    return res.json({
      success: true,
      message: 'Booking confirmed',
      zoom_link: zoom.join_url,
      booking_id: booking.id,
    });
  } catch (err) {
    return next(err);
  }
});

const isInternshipApplication = body => [
  'university', 'program', 'enrollment_status', 'graduation_year', 'year_of_study',
  'area_of_interest', 'availability_duration', 'hours_per_week',
].some(field => body[field] != null && body[field] !== '');

const saveCareersApplication = async application => {
  if (isInternshipApplication(application)) {
    await db.execute(
      `INSERT INTO internship_applications
        (id, full_name, email, phone, university, program, enrollment_status, graduation_year,
         year_of_study, area_of_interest, portfolio_url, linkedin_url, resume_url,
         availability_start, availability_duration, hours_per_week, skills, referral_source, extra_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        randomUUID(), application.full_name, application.email, application.phone,
        application.university, application.program, application.enrollment_status,
        application.graduation_year, application.year_of_study, application.area_of_interest,
        application.portfolio_url, application.linkedin_url, application.resume_url,
        safeDate(application.availability_start), application.availability_duration,
        application.hours_per_week, application.skills, application.referral_source,
        application.cover_letter,
      ]
    );
    return;
  }

  await db.execute(
    `INSERT INTO job_applications
      (id, full_name, email, phone, current_role, experience_yrs, linkedin_url,
       additional_links, resume_url, skills, extra_note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    [
      randomUUID(), application.full_name, application.email, application.phone,
      application.position, application.experience_yrs, application.linkedin_url,
      application.portfolio_url, application.resume_url, application.skills,
      application.cover_letter,
    ]
  );
};

// POST /api/site/careers — workflow DnizEPglnbzWvS0Q
router.post('/careers', submissionLimiter, async (req, res, next) => {
  if (req.body?.healthcheck === true) return health(res, 'site-careers');

  try {
    const body = req.body || {};
    if (!body.full_name || !body.email) {
      return res.status(400).json({ success: false, message: 'full_name and email required' });
    }
    const application = {
      full_name: body.full_name || body.name || '',
      email: body.email,
      phone: body.phone || null,
      position: body.position || body.job_title || null,
      area_of_interest: body.area_of_interest || null,
      portfolio_url: body.portfolio_url || null,
      linkedin_url: body.linkedin_url || null,
      cover_letter: body.cover_letter || body.message || null,
      university: body.university || null,
      program: body.program || null,
      enrollment_status: body.enrollment_status || null,
      graduation_year: body.graduation_year || null,
      year_of_study: body.year_of_study || null,
      availability_start: body.availability_start || null,
      availability_duration: body.availability_duration || null,
      hours_per_week: body.hours_per_week || null,
      skills: body.skills || null,
      referral_source: body.referral_source || null,
      experience_yrs: body.experience_yrs || null,
      resume_url: body.resume_url || null,
    };
    await saveCareersApplication(application);
    await sendCareersApplicationAlert(application);
    return res.json({ success: true, message: 'Application received. We will be in touch soon!' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/site/referral — workflow wQ2Qd8X7xv8s0Z2D
router.post('/referral', submissionLimiter, async (req, res, next) => {
  if (req.body?.healthcheck === true) {
    return health(res, 'site-referral', { includeTimestamp: true });
  }

  try {
    const { email, referral_code: referralCode, name } = req.body || {};
    if (!email || !referralCode) {
      return res.status(400).json({ success: false, message: 'Missing required fields: email or referral_code' });
    }
    if (!emailPattern.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    const [[existing]] = await db.execute('SELECT id FROM referrers WHERE email = ? LIMIT 1', [email]);
    if (existing) return res.json({ success: true, message: 'Already registered', code: referralCode });

    await db.execute(
      'INSERT INTO referrers (email, referral_code, is_verified, name) VALUES (?, ?, 1, ?)',
      [email, referralCode, name || null]
    );
    return res.json({ success: true, message: 'Referral saved', code: referralCode });
  } catch (err) {
    return next(err);
  }
});

// POST /api/site/payment-confirm — workflow kwOBYFfEwxiRBsWT
router.post('/payment-confirm', submissionLimiter, async (req, res, next) => {
  if (req.body?.healthcheck === true) {
    return health(res, 'payment-confirm', { includeDb: true, includeTimestamp: true });
  }

  try {
    const payment = req.body || {};
    await db.execute(
      `INSERT INTO payments
        (name, email, company, plan, billing, amount, whitelabel, payment_ref, txn_id,
         referral_code, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        payment.name, payment.email, payment.company || '', payment.plan, payment.billing,
        payment.total, payment.hasWhitelabel ? 1 : 0, payment.paymentRef || '',
        payment.txnId || '', payment.referralCode || '',
      ]
    );
    if (payment.referralCode) {
      await db.execute(
        `INSERT INTO referrals
          (id, referrer_id, client_name, client_email, plan_tier, order_amount,
           reward_amount, status, converted_at)
         SELECT UUID(), id, ?, ?, ?, ?, ROUND(? * 0.05, 2), 'pending', NOW()
         FROM referrers WHERE referral_code = ? LIMIT 1`,
        [
          payment.name, payment.email, payment.plan, payment.total,
          payment.total, payment.referralCode,
        ]
      );
    }
    await db.execute(
      `INSERT INTO dashboard_alerts (type, title, message, link)
       VALUES ('payment', 'New payment confirmation', ?, '/clients')`,
      [`${payment.name} submitted a payment confirmation for ${payment.plan} plan ($${payment.total}). TXN: ${payment.txnId}`]
    );
    await sendPaymentEmails(payment);
    return res.json({ success: true, message: 'Payment confirmation received' });
  } catch (err) {
    return next(err);
  }
});

// GET /api/site/jobs — workflow rqS2aaFNSSUYPhsM
router.get('/jobs', async (req, res, next) => {
  try {
    const [listings] = await db.execute(
      `SELECT id, title, department, type, location, description, requirements, created_at
       FROM job_listings WHERE is_active = 1 AND status = 'open' ORDER BY created_at DESC`
    );
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ success: true, listings, count: listings.length });
  } catch (err) {
    return next(err);
  }
});

export default router;
