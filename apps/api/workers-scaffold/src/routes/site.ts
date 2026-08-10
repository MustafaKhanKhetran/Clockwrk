import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";
import { ipRateLimit } from "../middleware/rateLimit";
import {
  pickAccountManager,
  pickClientPM,
} from "../services/bookingAutoAssign";
import {
  sendBookingEmails,
  sendCareersApplicationAlert,
  sendNewsletterWelcome,
  sendPaymentEmails,
  sendReferralEmails,
} from "../services/publicSiteEmails";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const submitLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: "site-submit",
});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nullable = (value: unknown) =>
  value === undefined || value === "" ? null : value;
const safeDate = (value: unknown) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null;
  return Number.isNaN(new Date(String(value)).getTime()) ? null : String(value);
};
type SiteContext = Context<{ Bindings: Env; Variables: Variables }>;
const body = async (c: SiteContext) =>
  (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<
    string,
    unknown
  >;
const health = (
  c: SiteContext,
  workflow: string,
  options: { includeDb?: boolean; includeTimestamp?: boolean } = {},
) =>
  c.json({
    status: "ok",
    workflow,
    ...(options.includeDb ? { db: "ok" } : {}),
    ...(options.includeTimestamp ? { ts: new Date().toISOString() } : {}),
  });

type Booking = {
  id: string;
  name: string;
  email: string;
  company: string;
  client_role: string;
  services: unknown;
  notes: string;
  guests: string;
  booking_date: string;
  booking_time: string;
  status: "confirmed";
};

async function createZoomMeeting(env: Env, booking: Booking) {
  if (!env.ZOOM_ACCOUNT_ID || !env.ZOOM_CLIENT_ID || !env.ZOOM_CLIENT_SECRET) {
    throw new Error("Zoom Server-to-Server OAuth is not configured");
  }
  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(env.ZOOM_ACCOUNT_ID)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`)}`,
      },
    },
  );
  if (!tokenResponse.ok)
    throw new Error(`Zoom token request failed (${tokenResponse.status})`);
  const token = await tokenResponse.json<{ access_token: string }>();
  const meetingResponse = await fetch(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: `Discovery Call — ${booking.name}${booking.company ? ` (${booking.company})` : ""}`,
        type: 2,
        start_time: new Date(
          `${booking.booking_date}T${booking.booking_time}:00+05:00`,
        ).toISOString(),
        duration: 30,
        timezone: "Asia/Karachi",
        settings: {
          host_video: true,
          participant_video: true,
          waiting_room: true,
        },
      }),
    },
  );
  if (!meetingResponse.ok)
    throw new Error(`Zoom meeting creation failed (${meetingResponse.status})`);
  return meetingResponse.json<{ id: number; join_url: string }>();
}

async function findBookingAssignee(env: Env, email: string) {
  const client = await env.DB.prepare(
    "SELECT id FROM clients WHERE email=? LIMIT 1",
  )
    .bind(email)
    .first<{ id: number }>();
  const id = client
    ? ((await pickClientPM(env.DB, client.id)) ??
      (await pickAccountManager(env.DB)))
    : await pickAccountManager(env.DB);
  if (!id) return null;
  return env.DB.prepare("SELECT id,name,email FROM employees WHERE id=?")
    .bind(id)
    .first<{ id: number; name: string; email: string }>();
}

app.post("/newsletter", submitLimit, async (c) => {
  const input = await body(c);
  if (input.healthcheck === true)
    return health(c, "site-newsletter", {
      includeDb: true,
      includeTimestamp: true,
    });
  if (!input.email)
    return c.json({ success: false, message: "Missing email" }, 400);
  const email = String(input.email).trim().toLowerCase();
  if (!emailPattern.test(email))
    return c.json({ success: false, message: "Invalid email" }, 400);
  const type = String(input.type || "marketing");
  if (!new Set(["marketing", "careers"]).has(type))
    return c.json({ success: false, message: "Invalid type" }, 400);
  const existing = await c.env.DB.prepare(
    "SELECT id FROM newsletter_subscribers WHERE email=? AND type=? LIMIT 1",
  )
    .bind(email, type)
    .first();
  if (existing) return c.json({ success: true, message: "already_subscribed" });
  await c.env.DB.prepare(
    "INSERT INTO newsletter_subscribers (email,type,source) VALUES (?,?,?)",
  )
    .bind(email, type, String(input.source || "footer"))
    .run();
  await sendNewsletterWelcome(c.env, { email, type });
  return c.json({ success: true });
});

app.get("/slots", async (c) => {
  const now = new Date();
  const year =
    Number.parseInt(c.req.query("year") || "", 10) || now.getFullYear();
  const month =
    Number.parseInt(c.req.query("month") || "", 10) || now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slots: Record<string, string[]> = {};
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    if ([0, 6].includes(date.getDay()) || date < today) continue;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    slots[key] = Array.from({ length: 18 }, (_, index) => {
      const hour = 9 + Math.floor(index / 2);
      return `${String(hour).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
    });
  }
  const booked = (
    await c.env.DB.prepare(
      "SELECT booking_date,booking_time FROM bookings WHERE status='confirmed' AND date(booking_date)>=date('now')",
    ).all<{ booking_date: string; booking_time: string }>()
  ).results;
  const occupied = new Set(
    booked.map(
      (row) =>
        `${String(row.booking_date).split(/[T ]/)[0]}|${row.booking_time}`,
    ),
  );
  const available = Object.fromEntries(
    Object.entries(slots)
      .map(([date, times]) => [
        date,
        times.filter((time) => !occupied.has(`${date}|${time}`)),
      ])
      .filter(([, times]) => (times as string[]).length),
  );
  return c.json({ slots: available });
});

app.post("/booking", submitLimit, async (c) => {
  const input = await body(c);
  if (input.healthcheck === true)
    return health(c, "site-booking", {
      includeDb: true,
      includeTimestamp: true,
    });
  if (!input.name || !input.email || !input.date || !input.time)
    return c.json(
      {
        success: false,
        message: "Missing required fields: name, email, date, time",
      },
      400,
    );
  if (!emailPattern.test(String(input.email)))
    return c.json({ success: false, message: "Invalid email address" }, 400);
  const guestInput = Array.isArray(input.guests) ? input.guests : [];
  const guests = guestInput
    .map((guest) => {
      if (typeof guest === "string")
        return {
          email: guest,
          name: (guest.split("@")[0] || guest)
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase()),
          role: "guest",
        };
      const record = (guest || {}) as Record<string, unknown>;
      return {
        email: String(record.email || ""),
        name: String(record.name || String(record.email || "").split("@")[0]),
        role: String(record.role || "guest"),
      };
    })
    .filter((guest) => guest.email);
  const booking: Booking = {
    id: crypto.randomUUID(),
    name: String(input.name),
    email: String(input.email),
    company: String(input.company || ""),
    client_role: String(input.client_role || input.role || "owner"),
    services: input.services || "",
    notes: String(input.notes || ""),
    guests: JSON.stringify(guests),
    booking_date: String(input.date),
    booking_time: String(input.time),
    status: "confirmed",
  };
  const taken = await c.env.DB.prepare(
    "SELECT id FROM bookings WHERE booking_date=? AND booking_time=? AND status='confirmed' LIMIT 1",
  )
    .bind(booking.booking_date, booking.booking_time)
    .first();
  if (taken)
    return c.json({
      success: false,
      error: "This time slot is already booked. Please choose another time.",
    });
  const assignee = await findBookingAssignee(c.env, booking.email);
  const zoom = await createZoomMeeting(c.env, booking);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO bookings (id,name,email,company,services,notes,guests,booking_date,booking_time,zoom_link,zoom_meeting_id,status,assigned_to,client_role) VALUES (?,?,?,?,?,?,?,?,?,?,?,'confirmed',?,?)`,
    ).bind(
      booking.id,
      booking.name,
      booking.email,
      booking.company,
      typeof booking.services === "string"
        ? booking.services
        : JSON.stringify(booking.services),
      booking.notes,
      booking.guests,
      booking.booking_date,
      booking.booking_time,
      zoom.join_url,
      String(zoom.id),
      assignee?.id ?? null,
      booking.client_role,
    ),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('booking','New booking received',?,'/bookings')",
    ).bind(
      `${booking.name}${booking.company ? ` (${booking.company})` : ""} booked a call for ${booking.booking_date} at ${booking.booking_time} — assigned to ${assignee?.name || "Mustafa Khan"}`,
    ),
  ]);
  await sendBookingEmails(c.env, { booking, zoom, assignee });
  return c.json({
    success: true,
    message: "Booking confirmed",
    zoom_link: zoom.join_url,
    booking_id: booking.id,
  });
});

const internshipFields = [
  "university",
  "program",
  "enrollment_status",
  "graduation_year",
  "year_of_study",
  "area_of_interest",
  "availability_duration",
  "hours_per_week",
];

app.post("/careers", submitLimit, async (c) => {
  const input = await body(c);
  if (input.healthcheck === true) return health(c, "site-careers");
  if (!input.full_name || !input.email)
    return c.json(
      { success: false, message: "full_name and email required" },
      400,
    );
  const application: Record<string, unknown> = {
    full_name: input.full_name || input.name || "",
    email: input.email,
    phone: nullable(input.phone),
    position: nullable(input.position || input.job_title),
    area_of_interest: nullable(input.area_of_interest),
    portfolio_url: nullable(input.portfolio_url),
    linkedin_url: nullable(input.linkedin_url),
    cover_letter: nullable(input.cover_letter || input.message),
    university: nullable(input.university),
    program: nullable(input.program),
    enrollment_status: nullable(input.enrollment_status),
    graduation_year: nullable(input.graduation_year),
    year_of_study: nullable(input.year_of_study),
    availability_start: nullable(input.availability_start),
    availability_duration: nullable(input.availability_duration),
    hours_per_week: nullable(input.hours_per_week),
    skills: nullable(input.skills),
    referral_source: nullable(input.referral_source),
    experience_yrs: nullable(input.experience_yrs),
    resume_url: nullable(input.resume_url),
  };
  const isInternship = internshipFields.some(
    (field) => application[field] !== null && application[field] !== "",
  );
  if (isInternship) {
    await c.env.DB.prepare(
      `INSERT INTO internship_applications (id,full_name,email,phone,university,program,enrollment_status,graduation_year,year_of_study,area_of_interest,portfolio_url,linkedin_url,resume_url,availability_start,availability_duration,hours_per_week,skills,referral_source,extra_note,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new')`,
    )
      .bind(
        crypto.randomUUID(),
        application.full_name,
        application.email,
        application.phone,
        application.university,
        application.program,
        application.enrollment_status,
        application.graduation_year,
        application.year_of_study,
        application.area_of_interest,
        application.portfolio_url,
        application.linkedin_url,
        application.resume_url,
        safeDate(application.availability_start),
        application.availability_duration,
        application.hours_per_week,
        application.skills,
        application.referral_source,
        application.cover_letter,
      )
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO job_applications (id,full_name,email,phone,current_role,experience_yrs,linkedin_url,additional_links,resume_url,skills,extra_note,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'new')`,
    )
      .bind(
        crypto.randomUUID(),
        application.full_name,
        application.email,
        application.phone,
        application.position,
        application.experience_yrs,
        application.linkedin_url,
        application.portfolio_url,
        application.resume_url,
        application.skills,
        application.cover_letter,
      )
      .run();
  }
  await sendCareersApplicationAlert(c.env, application);
  return c.json({
    success: true,
    message: "Application received. We will be in touch soon!",
  });
});

// 7-char code from a lookalike-free alphabet.
function generateReferralCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join("");
}

app.post("/referral", submitLimit, async (c) => {
  const input = await body(c);
  if (input.healthcheck === true)
    return health(c, "site-referral", { includeTimestamp: true });
  if (!input.email)
    return c.json({ success: false, message: "Email is required" }, 400);
  const email = String(input.email);
  if (!emailPattern.test(email))
    return c.json({ success: false, message: "Invalid email address" }, 400);

  // Idempotent: if this email is already a referrer, return their existing code.
  const existing = await c.env.DB.prepare(
    "SELECT referral_code FROM referrers WHERE email=? LIMIT 1",
  )
    .bind(email)
    .first<{ referral_code: string }>();
  if (existing)
    return c.json({
      success: true,
      message: "Already registered",
      code: existing.referral_code,
    });

  const code = generateReferralCode();
  await c.env.DB.prepare(
    "INSERT INTO referrers (id,email,referral_code,is_verified,name) VALUES (?,?,?,1,?)",
  )
    .bind(crypto.randomUUID(), email, code, nullable(input.name))
    .run();
  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','New referrer',?,?)",
  )
    .bind(`${email} registered as a referrer`, "/referrals")
    .run();
  c.executionCtx.waitUntil(
    sendReferralEmails(c.env, {
      email,
      name: (input.name as string | null | undefined) ?? null,
      referral_code: code,
    }).catch((err) => console.error("referral-notify:", err)),
  );
  return c.json({ success: true, message: "Referral saved", code });
});

app.post("/payment-confirm", submitLimit, async (c) => {
  const payment = await body(c);
  if (payment.healthcheck === true)
    return health(c, "payment-confirm", {
      includeDb: true,
      includeTimestamp: true,
    });
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO payments (name,email,company,plan,billing,amount,whitelabel,payment_ref,txn_id,referral_code,status,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
    ).bind(
      nullable(payment.name),
      nullable(payment.email),
      String(payment.company || ""),
      nullable(payment.plan),
      nullable(payment.billing),
      nullable(payment.total),
      payment.hasWhitelabel ? 1 : 0,
      String(payment.paymentRef || ""),
      String(payment.txnId || ""),
      String(payment.referralCode || ""),
    ),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('payment','New payment confirmation',?,'/clients')",
    ).bind(
      `${String(payment.name)} submitted a payment confirmation for ${String(payment.plan)} plan ($${String(payment.total)}). TXN: ${String(payment.txnId)}`,
    ),
  ]);
  if (payment.referralCode) {
    await c.env.DB.prepare(
      `INSERT INTO referrals (id,referrer_id,client_name,client_email,plan_tier,order_amount,reward_amount,status,converted_at) SELECT ?,id,?,?,?,?,ROUND(? * 0.05,2),'pending',CURRENT_TIMESTAMP FROM referrers WHERE referral_code=? LIMIT 1`,
    )
      .bind(
        crypto.randomUUID(),
        nullable(payment.name),
        nullable(payment.email),
        nullable(payment.plan),
        nullable(payment.total),
        nullable(payment.total),
        String(payment.referralCode),
      )
      .run();
  }
  await sendPaymentEmails(c.env, payment);
  return c.json({
    success: true,
    message: "Payment confirmation received",
  });
});

app.get("/jobs", async (c) => {
  const listings = (
    await c.env.DB.prepare(
      `SELECT id,title,department,type,location,description,requirements,created_at FROM job_listings WHERE is_active=1 AND status='open' ORDER BY created_at DESC`,
    ).all()
  ).results;
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ success: true, listings, count: listings.length });
});

export default app;
