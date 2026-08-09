import { sendEmail } from './outboundEmail.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const emailShell = ({ eyebrow, title, body, footer = 'clockwrk.io' }) => `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#ebebea;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ebebea"><tr><td align="center" style="padding:40px 20px 48px">
<table width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px">
<tr><td style="padding:0 4px 28px;font-size:20px;font-weight:700;color:#101012">clockwrk</td></tr>
<tr><td style="background:#101012;border-radius:20px;padding:44px 40px 40px">
<p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a0e92a">${eyebrow}</p>
<h1 style="margin:0 0 16px;font-size:32px;font-weight:400;color:#ebebea;line-height:1.1">${title}</h1>
<div style="font-size:15px;color:#8d8d8f;line-height:1.6">${body}</div>
</td></tr><tr><td style="padding-top:24px;font-size:12px;color:#8d8d8f">© 2026 Clockwrk. All rights reserved. <span style="float:right">${footer}</span></td></tr>
</table></td></tr></table></body></html>`;

export const sendNewsletterWelcome = ({ email, type }) => sendEmail({
  to: [email],
  subject: type === 'careers'
    ? "You'll hear it first — Clockwrk Jobs"
    : "You're on the list — Clockwrk",
  html: emailShell(type === 'careers' ? {
    eyebrow: 'Job Alerts',
    title: "You'll hear it first.",
    body: '<p style="margin:0">Every time a new role opens at Clockwrk — design, development, or operations — you\'ll be the first to know. No spam, just opportunities.</p>',
  } : {
    eyebrow: 'Newsletter',
    title: "You're on the list.",
    body: '<p style="margin:0">We\'ll be in touch with updates, insights, and the occasional thing worth your time. No fluff, no spam — just Clockwrk.</p>',
  }),
});

const formatBookingTime = (date, time) => {
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const [hours, minutes] = time.split(':').map(Number);
  const end = new Date(2000, 0, 1, hours, minutes + 30);
  const clock = value => value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { formattedDate, formattedTime: `${clock(new Date(2000, 0, 1, hours, minutes))} – ${clock(end)} PKT` };
};

export const sendBookingEmails = async ({ booking, zoom, assignee }) => {
  const { formattedDate, formattedTime } = formatBookingTime(booking.booking_date, booking.booking_time);
  const clientHtml = emailShell({
    eyebrow: 'Discovery call',
    title: "You're booked.",
    body: `<p><strong style="color:#ebebea">${escapeHtml(formattedDate)}</strong><br>${escapeHtml(formattedTime)} · 30 minutes · Asia/Karachi</p>
      <p>${escapeHtml(booking.name)} · ${escapeHtml(booking.company || '—')}</p>
      <p>Services: ${escapeHtml(booking.services || 'Not specified')}</p>
      <p><a href="${escapeHtml(zoom.join_url)}" style="display:inline-block;background:#a0e92a;color:#101012;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open Zoom Meeting →</a></p>`,
  });
  const internalHtml = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9f9f9;border-radius:12px">
    <h2>New Discovery Call Booked</h2>
    <p>Assigned to: <strong>${escapeHtml(assignee?.name || 'Mustafa Khan')}</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(booking.name)}<br><strong>Email:</strong> ${escapeHtml(booking.email)}<br><strong>Company:</strong> ${escapeHtml(booking.company || '—')}<br><strong>Date:</strong> ${escapeHtml(formattedDate)}<br><strong>Time:</strong> ${escapeHtml(formattedTime)}<br><strong>Services:</strong> ${escapeHtml(booking.services || '—')}<br><strong>Notes:</strong> ${escapeHtml(booking.notes || '—')}</p>
    <p><a href="${escapeHtml(zoom.join_url)}">Join Zoom Meeting →</a></p></div>`;

  await Promise.all([
    sendEmail({
      to: [booking.email],
      subject: "You're booked — Clockwrk Discovery Call",
      html: clientHtml,
    }),
    sendEmail({
      from: process.env.RESEND_FROM,
      to: [assignee?.email || 'mustafakhankhetran1@gmail.com'],
      bcc: ['mustafakhankhetran1@gmail.com'],
      subject: `New Booking: ${booking.name} — ${booking.booking_date} at ${booking.booking_time}`,
      html: internalHtml,
    }),
  ]);
};

export const sendCareersApplicationAlert = application => {
  const optional = (label, value) => value
    ? `<p><b>${label}:</b> ${escapeHtml(value)}</p>`
    : '';
  return sendEmail({
    to: ['mkk@clockwrk.io'],
    subject: `New Application: ${application.full_name} — ${application.position || 'General'}`,
    html: `<h2>New Application</h2>
      <p><b>Name:</b> ${escapeHtml(application.full_name)}</p>
      <p><b>Email:</b> ${escapeHtml(application.email)}</p>
      <p><b>Phone:</b> ${escapeHtml(application.phone || 'Not provided')}</p>
      <p><b>Position:</b> ${escapeHtml(application.position || 'General Application')}</p>
      ${optional('University', application.university)}${optional('Program', application.program)}${optional('Status', application.enrollment_status)}${optional('Graduation', application.graduation_year)}${optional('Skills', application.skills)}${optional('Available From', application.availability_start)}${optional('Hours/Week', application.hours_per_week)}${optional('Portfolio', application.portfolio_url)}${optional('LinkedIn', application.linkedin_url)}${optional('Experience', application.experience_yrs)}
      <p><b>Cover Letter:</b></p><p>${escapeHtml(application.cover_letter || 'Not provided')}</p>
      ${application.resume_url ? `<p><b>CV / resume:</b> <a href="${escapeHtml(application.resume_url)}">Open attached CV information</a></p>` : ''}
      <hr><p><a href="https://dashboard.clockwrk.io/jobs">View in Dashboard →</a></p>`,
  });
};

export const sendPaymentEmails = async payment => {
  const internalHtml = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9f9f9;border-radius:12px">
    <h2>New Payment Confirmation</h2><p>A client has submitted a payment confirmation and is waiting for portal access.</p>
    <p><b>Name:</b> ${escapeHtml(payment.name)}<br><b>Email:</b> ${escapeHtml(payment.email)}<br><b>Company:</b> ${escapeHtml(payment.company || '—')}<br><b>Plan:</b> ${escapeHtml(payment.plan)} / ${escapeHtml(payment.billing)}<br><b>Amount:</b> $${escapeHtml(payment.total)}<br><b>White Label:</b> ${payment.hasWhitelabel ? 'Yes' : 'No'}<br><b>Payment Ref:</b> ${escapeHtml(payment.paymentRef)}<br><b>Transaction ID:</b> ${escapeHtml(payment.txnId)}<br><b>Referral Code:</b> ${escapeHtml(payment.referralCode || '—')}</p>
    <p><a href="https://dashboard.clockwrk.io">Verify payment and add client in dashboard →</a></p></div>`;
  const clientHtml = emailShell({
    eyebrow: 'Payment confirmation',
    title: 'Payment confirmation received.',
    body: `<p>Hi ${escapeHtml(payment.name)}, we\'ve received your payment confirmation and are currently verifying your transfer. You\'ll receive your portal access code within 24 hours once confirmed.</p><p>Plan: ${escapeHtml(payment.plan)} / ${escapeHtml(payment.billing)}<br>Amount: $${escapeHtml(payment.total)}<br>Reference: ${escapeHtml(payment.paymentRef)}</p>`,
  });

  await Promise.all([
    sendEmail({
      to: ['mustafakhankhetran1@gmail.com'],
      subject: `🔔 New Payment Confirmation — ${payment.name} (${payment.plan})`,
      html: internalHtml,
    }),
    sendEmail({
      to: [payment.email],
      subject: "We've received your payment confirmation",
      html: clientHtml,
    }),
  ]);
};

const jobAlertHtml = job => `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#101012;padding:32px;border-radius:12px;color:#ebebea">
  <h1>We're Hiring</h1><h2>${escapeHtml(job.title)}</h2>
  <p style="color:#aaa">${escapeHtml(job.department)} · ${escapeHtml(job.type)} · ${escapeHtml(job.location)}</p>
  <p>${escapeHtml(job.description)}</p><h3>Requirements</h3><p>${escapeHtml(job.requirements)}</p>
  <p><a href="https://clockwrk.io/careers" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Apply Now →</a></p></div>`;

export const sendJobAlerts = async (subscribers, job) => {
  await Promise.all(subscribers.map(({ email }) => sendEmail({
    from: process.env.RESEND_FROM,
    to: [email],
    subject: `New Opportunity at Clockwrk: ${job.title}`,
    html: jobAlertHtml(job),
  })));
};
