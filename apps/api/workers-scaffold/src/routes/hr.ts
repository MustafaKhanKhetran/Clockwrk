import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;
import { requireEmployee, requireRoles } from "../middleware/auth";
import { ipRateLimit } from "../middleware/rateLimit";
import { sendJobAlerts, sendCareersApplicationAlert, sendApplicantConfirmation } from "../services/publicSiteEmails";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const ACCESS = ["owner", "admin", "hr"];
const applyLimit = ipRateLimit({
  windowMs: 3_600_000,
  max: 10,
  keyPrefix: "hr-apply",
});
const date = (value: unknown) =>
  value &&
  /^\d{4}-\d{2}-\d{2}/.test(String(value)) &&
  !Number.isNaN(new Date(String(value)).getTime())
    ? String(value)
    : null;
// Fires the post-insert notifications for either apply flow: dashboard alert
// row + applicant confirmation email + internal team alert. Called via
// ctx.waitUntil so the applicant's HTTP response returns without waiting
// on Resend.
async function notifyApplication(
  c: Ctx,
  kind: "job" | "internship",
  body: Record<string, unknown>,
) {
  const jobTitle = body.job_id
    ? (
        await c.env.DB.prepare("SELECT title FROM job_listings WHERE id=?")
          .bind(body.job_id)
          .first<{ title: string }>()
      )?.title
    : undefined;
  const label = jobTitle || (kind === "internship" ? "Internship" : "General application");
  const link = kind === "internship" ? "/hr?tab=internships" : "/hr";

  await c.env.DB.prepare(
    "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system',?,?,?)",
  )
    .bind(
      kind === "internship" ? "New internship application" : "New job application",
      `${String(body.full_name)} applied — ${label}`,
      link,
    )
    .run();

  c.executionCtx.waitUntil(
    Promise.all([
      sendApplicantConfirmation(c.env, {
        email: String(body.email),
        full_name: String(body.full_name),
        kind,
        job_title: jobTitle,
      }),
      sendCareersApplicationAlert(c.env, { ...body, job_title: jobTitle }),
    ]).catch((err) => console.error("apply-notify:", err)),
  );
}

app.post("/apply/job", applyLimit, async (c) => {
  const b: Record<string, unknown> = await c.req
    .json<Record<string, unknown>>()
    .catch(() => ({}));
  if (!b.full_name || !b.email)
    return c.json(
      { success: false, message: "full_name and email are required" },
      400,
    );
  const keys = [
    "job_id",
    "full_name",
    "email",
    "phone",
    "location",
    "availability_type",
    "availability_start",
    "experience_yrs",
    "seniority_level",
    "current_role",
    "remote_experience",
    "has_shipped_work",
    "linkedin_url",
    "additional_links",
    "resume_url",
    "skills",
    "best_work_description",
    "hardest_part",
    "why_clockwrk",
    "strongest_skill",
    "improvement_area",
    "work_style",
    "extra_note",
  ];
  const values = keys.map((key) =>
    key === "availability_start" ? date(b[key]) : b[key] || null,
  );
  await c.env.DB.prepare(
    `INSERT INTO job_applications (id,${keys.join(",")},status) VALUES (?,${keys.map(() => "?").join(",")},'new')`,
  )
    .bind(crypto.randomUUID(), ...values)
    .run();
  await notifyApplication(c, "job", b);
  return c.json({ success: true, message: "Application received" });
});
app.post("/apply/internship", applyLimit, async (c) => {
  const b: Record<string, unknown> = await c.req
    .json<Record<string, unknown>>()
    .catch(() => ({}));
  if (!b.full_name || !b.email)
    return c.json(
      { success: false, message: "full_name and email are required" },
      400,
    );
  const keys = [
    "job_id",
    "full_name",
    "email",
    "phone",
    "location",
    "university",
    "program",
    "enrollment_status",
    "graduation_year",
    "year_of_study",
    "area_of_interest",
    "portfolio_url",
    "linkedin_url",
    "resume_url",
    "availability_start",
    "availability_duration",
    "hours_per_week",
    "skills",
    "referral_source",
    "why_clockwrk",
    "strongest_skill",
    "improvement_area",
    "work_style",
    "extra_note",
  ];
  const values = keys.map((key) =>
    key === "availability_start" ? date(b[key]) : b[key] || null,
  );
  await c.env.DB.prepare(
    `INSERT INTO internship_applications (id,${keys.join(",")},status) VALUES (?,${keys.map(() => "?").join(",")},'new')`,
  )
    .bind(crypto.randomUUID(), ...values)
    .run();
  await notifyApplication(c, "internship", b);
  return c.json({ success: true, message: "Application received" });
});
app.get("/", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const [listings, jobs, internships] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT jl.*,(SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id=jl.id) AS job_applicant_count,(SELECT COUNT(*) FROM internship_applications ia WHERE ia.job_id=jl.id) AS internship_applicant_count FROM job_listings jl ORDER BY jl.created_at DESC",
    ),
    c.env.DB.prepare(
      "SELECT ja.*,jl.title AS job_title,jl.department,'job' AS application_type FROM job_applications ja LEFT JOIN job_listings jl ON jl.id=ja.job_id ORDER BY ja.applied_at DESC",
    ),
    c.env.DB.prepare(
      "SELECT ia.*,jl.title AS job_title,jl.department,'internship' AS application_type FROM internship_applications ia LEFT JOIN job_listings jl ON jl.id=ia.job_id ORDER BY ia.applied_at DESC",
    ),
  ]);
  return c.json({
    success: true,
    listings: listings?.results ?? [],
    job_applications: jobs?.results ?? [],
    internship_applications: internships?.results ?? [],
  });
});
app.patch(
  "/applications/:id",
  requireEmployee,
  requireRoles(...ACCESS),
  async (c) => {
    const b = await c.req.json<{
      status: string;
      notes?: string;
      application_type?: string;
    }>();
    const type = b.application_type === "internship" ? "internship" : "job";
    const table =
      type === "internship" ? "internship_applications" : "job_applications";
    const current = await c.env.DB.prepare(
      `SELECT status FROM ${table} WHERE id=?`,
    )
      .bind(c.req.param("id"))
      .first<{ status: string }>();
    if (!current)
      return c.json({ success: false, message: "Application not found" }, 404);
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE ${table} SET status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      ).bind(b.status, b.notes || "", c.req.param("id")),
      c.env.DB.prepare(
        "INSERT INTO application_status_log (id,application_id,application_type,old_status,new_status,changed_at,changed_by) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,?)",
      ).bind(
        crypto.randomUUID(),
        c.req.param("id"),
        type,
        current.status,
        b.status,
        c.get("employee")!.id,
      ),
    ]);
    return c.json({ success: true });
  },
);
app.delete(
  "/applications/:id",
  requireEmployee,
  requireRoles(...ACCESS),
  async (c) => {
    const table =
      c.req.query("type") === "internship"
        ? "internship_applications"
        : "job_applications";
    await c.env.DB.prepare(`DELETE FROM ${table} WHERE id=?`)
      .bind(c.req.param("id"))
      .run();
    return c.json({ success: true });
  },
);
app.post("/listings", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  if (!b.title)
    return c.json({ success: false, message: "Job title is required" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO job_listings (id,title,department,description,requirements,type,status,location,is_active) VALUES (?,?,?,?,?,?,'open',?,1)",
  )
    .bind(
      crypto.randomUUID(),
      b.title,
      b.department || "",
      b.description || "",
      b.requirements || "",
      b.type || "full-time",
      b.location || "Remote",
    )
    .run();
  const subscribers = (
    await c.env.DB.prepare(
      "SELECT email FROM newsletter_subscribers WHERE type='careers' AND status='active'",
    ).all<{ email: string }>()
  ).results;
  if (subscribers.length) await sendJobAlerts(c.env, subscribers, b);
  return c.json({
    success: true,
    message: subscribers.length
      ? "Job posted and alerts sent"
      : "Job posted, no careers subscribers to notify",
  });
});
app.patch(
  "/listings/:id",
  requireEmployee,
  requireRoles(...ACCESS),
  async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare(
      "UPDATE job_listings SET title=?,department=?,description=?,requirements=?,type=?,status=?,location=? WHERE id=?",
    )
      .bind(
        b.title,
        b.department || "",
        b.description || "",
        b.requirements || "",
        b.type || "full-time",
        b.status || "open",
        b.location || "Remote",
        c.req.param("id"),
      )
      .run();
    return c.json({ success: true });
  },
);
app.patch(
  "/listings/:id/toggle",
  requireEmployee,
  requireRoles(...ACCESS),
  async (c) => {
    const listing = await c.env.DB.prepare(
      "SELECT is_active FROM job_listings WHERE id=?",
    )
      .bind(c.req.param("id"))
      .first<{ is_active: number }>();
    if (!listing)
      return c.json({ success: false, message: "Listing not found" }, 404);
    const active = listing.is_active ? 0 : 1;
    const status = active ? "open" : "closed";
    await c.env.DB.prepare(
      "UPDATE job_listings SET is_active=?,status=?,closed_at=? WHERE id=?",
    )
      .bind(
        active,
        status,
        active ? null : new Date().toISOString(),
        c.req.param("id"),
      )
      .run();
    return c.json({ success: true, is_active: active, status });
  },
);
app.delete(
  "/listings/:id",
  requireEmployee,
  requireRoles("owner", "admin"),
  async (c) => {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM job_applications WHERE job_id=?").bind(
        c.req.param("id"),
      ),
      c.env.DB.prepare(
        "DELETE FROM internship_applications WHERE job_id=?",
      ).bind(c.req.param("id")),
      c.env.DB.prepare("DELETE FROM job_listings WHERE id=?").bind(
        c.req.param("id"),
      ),
    ]);
    return c.json({ success: true });
  },
);
export default app;
