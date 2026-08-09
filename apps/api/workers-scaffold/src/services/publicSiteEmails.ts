import type { Env } from "../types";
import { sendEmail } from "../lib/email";
const esc = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const shell = (eyebrow: string, title: string, body: string) =>
  `<!doctype html><html><body style="margin:0;background:#ebebea;font-family:Arial,sans-serif"><table width="100%"><tr><td align="center" style="padding:40px 20px"><table width="480" style="max-width:480px;width:100%"><tr><td style="font-size:20px;font-weight:700;padding-bottom:28px">clockwrk</td></tr><tr><td style="background:#101012;border-radius:20px;padding:44px 40px;color:#8d8d8f"><p style="color:#a0e92a;font-size:11px;font-weight:700;text-transform:uppercase">${eyebrow}</p><h1 style="color:#ebebea;font-size:32px;font-weight:400">${title}</h1>${body}</td></tr></table></td></tr></table></body></html>`;
export const sendNewsletterWelcome = (
  env: Env,
  input: { email: string; type: string },
) =>
  sendEmail(env, {
    to: input.email,
    subject:
      input.type === "careers"
        ? "You'll hear it first — Clockwrk Jobs"
        : "You're on the list — Clockwrk",
    html: shell(
      input.type === "careers" ? "Job Alerts" : "Newsletter",
      input.type === "careers"
        ? "You'll hear it first."
        : "You're on the list.",
      `<p>${input.type === "careers" ? "Every time a new role opens at Clockwrk, you'll be the first to know." : "We'll be in touch with updates and insights. No spam, just Clockwrk."}</p>`,
    ),
  });
function bookingTime(date: string, time: string) {
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const clock = (value: Date) =>
    value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return {
    formattedDate,
    formattedTime: `${clock(new Date(2000, 0, 1, hours, minutes))} – ${clock(new Date(2000, 0, 1, hours, minutes + 30))} PKT`,
  };
}
export async function sendBookingEmails(
  env: Env,
  input: {
    booking: Record<string, unknown>;
    zoom: { join_url: string };
    assignee: { name?: string; email?: string } | null;
  },
) {
  const { booking, zoom, assignee } = input;
  const when = bookingTime(
    String(booking.booking_date),
    String(booking.booking_time),
  );
  await Promise.all([
    sendEmail(env, {
      to: String(booking.email),
      subject: "You're booked — Clockwrk Discovery Call",
      html: shell(
        "Discovery call",
        "You're booked.",
        `<p><strong style="color:#ebebea">${esc(when.formattedDate)}</strong><br>${esc(when.formattedTime)} · 30 minutes · Asia/Karachi</p><p>${esc(booking.name)} · ${esc(booking.company || "—")}</p><p>Services: ${esc(booking.services || "Not specified")}</p><p><a href="${esc(zoom.join_url)}" style="background:#a0e92a;color:#101012;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open Zoom Meeting →</a></p>`,
      ),
    }),
    sendEmail(env, {
      to: assignee?.email || env.INTERNAL_ALERT_EMAIL,
      subject: `New Booking: ${String(booking.name)} — ${String(booking.booking_date)} at ${String(booking.booking_time)}`,
      html: `<h2>New Discovery Call Booked</h2><p>Assigned to: <b>${esc(assignee?.name || "Mustafa Khan")}</b></p><p>${esc(booking.name)} · ${esc(booking.email)} · ${esc(booking.company || "—")}</p><p>${esc(when.formattedDate)} · ${esc(when.formattedTime)}</p><p><a href="${esc(zoom.join_url)}">Join Zoom Meeting →</a></p>`,
    }),
  ]);
}
export const sendCareersApplicationAlert = (
  env: Env,
  application: Record<string, unknown>,
) =>
  sendEmail(env, {
    to: env.INTERNAL_ALERT_EMAIL,
    subject: `New Application: ${String(application.full_name)} — ${String(application.position || "General")}`,
    html: `<h2>New Application</h2><p><b>Name:</b> ${esc(application.full_name)}</p><p><b>Email:</b> ${esc(application.email)}</p><p><b>Phone:</b> ${esc(application.phone || "Not provided")}</p><p><b>Position:</b> ${esc(application.position || "General Application")}</p><p><b>Skills:</b> ${esc(application.skills || "—")}</p><p><b>Cover Letter:</b> ${esc(application.cover_letter || "Not provided")}</p>${application.resume_url ? `<p><a href="${esc(application.resume_url)}">Open CV / resume</a></p>` : ""}`,
  });
export async function sendPaymentEmails(
  env: Env,
  payment: Record<string, unknown>,
) {
  await Promise.all([
    sendEmail(env, {
      to: env.INTERNAL_ALERT_EMAIL,
      subject: `New Payment Confirmation — ${String(payment.name)} (${String(payment.plan)})`,
      html: `<h2>New Payment Confirmation</h2><p>${esc(payment.name)} · ${esc(payment.email)} · ${esc(payment.company || "—")}</p><p>${esc(payment.plan)} / ${esc(payment.billing)} · $${esc(payment.total)} · ${esc(payment.paymentRef)}</p>`,
    }),
    sendEmail(env, {
      to: String(payment.email),
      subject: "We've received your payment confirmation",
      html: shell(
        "Payment confirmation",
        "Payment confirmation received.",
        `<p>Hi ${esc(payment.name)}, we've received your confirmation and are verifying your transfer. Portal access follows once confirmed.</p><p>${esc(payment.plan)} / ${esc(payment.billing)} · $${esc(payment.total)} · ${esc(payment.paymentRef)}</p>`,
      ),
    }),
  ]);
}
export async function sendJobAlerts(
  env: Env,
  subscribers: Array<{ email: string }>,
  job: Record<string, unknown>,
) {
  await Promise.all(
    subscribers.map(({ email }) =>
      sendEmail(env, {
        to: email,
        subject: `New Opportunity at Clockwrk: ${String(job.title)}`,
        html: `<div style="font-family:Arial,sans-serif;background:#101012;padding:32px;border-radius:12px;color:#ebebea"><h1>We're Hiring</h1><h2>${esc(job.title)}</h2><p>${esc(job.department)} · ${esc(job.type)} · ${esc(job.location)}</p><p>${esc(job.description)}</p><h3>Requirements</h3><p>${esc(job.requirements)}</p><p><a href="https://clockwrk.io/careers">Apply Now →</a></p></div>`,
      }),
    ),
  );
}
