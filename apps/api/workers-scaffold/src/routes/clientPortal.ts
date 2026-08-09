import { Hono, type Context } from "hono";
import type { Env, Variables } from "../types";
import { requireClient } from "../middleware/auth";
import { ipRateLimit } from "../middleware/rateLimit";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { randomToken, sha256Hex, signClient } from "../lib/tokens";
import {
  isAllowedMime,
  MAX_UPLOAD_BYTES,
  putR2,
  safeKey,
} from "../lib/uploads";
import contentRoutes from "./clientPortalContent";
import requestRoutes from "./clientPortalRequests";
import billingRoutes from "./clientPortalBilling";

type App = { Bindings: Env; Variables: Variables };
type Ctx = Context<App>;
type Row = Record<string, any>;
const app = new Hono<App>();
const credentialLimit = ipRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "client-cred",
});
const json = async (c: Ctx): Promise<Row> =>
  c.req.json<Row>().catch(() => ({}));
const clientId = (c: Ctx) => c.get("client")!.id;
const findSetupClient = async (c: Ctx, raw: unknown) => {
  if (!raw) return null;
  return c.env.DB.prepare(
    `SELECT id,name,email,phone,company,avatar_url,plan,billing,status,account_setup_expires_at,account_setup_completed_at FROM clients WHERE account_setup_token_hash=? AND account_setup_expires_at IS NOT NULL AND account_setup_expires_at>CURRENT_TIMESTAMP AND account_setup_completed_at IS NULL`,
  )
    .bind(await sha256Hex(String(raw)))
    .first<Row>();
};
const setupView = (row: Row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  company: row.company,
  avatar_url: row.avatar_url,
  plan: row.plan,
  billing: row.billing,
  setup_expires_at: row.account_setup_expires_at,
});

app.post("/login", credentialLimit, async (c) => {
  const input = await json(c);
  if (!input.email || !input.password)
    return c.json(
      { success: false, message: "Email and password required" },
      400,
    );
  const row = await c.env.DB.prepare(
    `SELECT id,name,email,phone,company,avatar_url,plan,billing,status,password_hash,subscribed_at,portal_role,portal_onboarding_version,onboarding_completed_at FROM clients WHERE email=?`,
  )
    .bind(input.email)
    .first<Row>();
  if (!row)
    return c.json({ success: false, message: "Invalid credentials" }, 401);
  if (row.status !== "active")
    return c.json({ success: false, message: "Account is not active" }, 403);
  if (!row.password_hash)
    return c.json(
      {
        success: false,
        message: "Portal access not set up. Contact Clockwrk.",
      },
      403,
    );
  if (!(await verifyPassword(String(input.password), row.password_hash)))
    return c.json({ success: false, message: "Invalid credentials" }, 401);
  const { password_hash: _passwordHash, ...safeClient } = row;
  return c.json({
    success: true,
    token: await signClient(c.env, row as any),
    client: safeClient,
  });
});

app.get("/me", requireClient, async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id,name,email,phone,company,avatar_url,plan,billing,status,subscribed_at,next_payment_due,last_payment_date,notify_prefs,portal_role,portal_onboarding_version,onboarding_completed_at FROM clients WHERE id=?`,
  )
    .bind(clientId(c))
    .first();
  return row
    ? c.json({ success: true, client: row })
    : c.json({ success: false, message: "Client not found" }, 404);
});

app.put("/onboarding", requireClient, async (c) => {
  const version = Math.max(
    0,
    Math.min(100, Number((await json(c)).version) || 0),
  );
  await c.env.DB.prepare(
    `UPDATE clients SET portal_onboarding_version=MAX(portal_onboarding_version,?),onboarding_completed_at=CASE WHEN ?>0 THEN CURRENT_TIMESTAMP ELSE onboarding_completed_at END WHERE id=?`,
  )
    .bind(version, version, clientId(c))
    .run();
  const row = await c.env.DB.prepare(
    "SELECT portal_onboarding_version FROM clients WHERE id=?",
  )
    .bind(clientId(c))
    .first<{ portal_onboarding_version: number }>();
  return c.json({
    success: true,
    portal_onboarding_version: Number(
      row?.portal_onboarding_version || version,
    ),
  });
});

app.patch("/me", requireClient, async (c) => {
  const b = await json(c);
  await c.env.DB.prepare(
    "UPDATE clients SET name=COALESCE(?,name),phone=COALESCE(?,phone),company=COALESCE(?,company),avatar_url=COALESCE(?,avatar_url) WHERE id=?",
  )
    .bind(
      b.name || null,
      b.phone || null,
      b.company || null,
      b.avatar_url || null,
      clientId(c),
    )
    .run();
  const row = await c.env.DB.prepare(
    "SELECT id,name,email,phone,company,avatar_url,plan,billing,status,subscribed_at FROM clients WHERE id=?",
  )
    .bind(clientId(c))
    .first();
  return c.json({ success: true, client: row });
});

app.post("/change-password", credentialLimit, requireClient, async (c) => {
  const b = await json(c);
  if (!b.current_password || !b.new_password)
    return c.json({ success: false, message: "Both passwords required" }, 400);
  if (String(b.new_password).length < 8)
    return c.json(
      { success: false, message: "Password must be at least 8 characters" },
      400,
    );
  const row = await c.env.DB.prepare(
    "SELECT password_hash FROM clients WHERE id=?",
  )
    .bind(clientId(c))
    .first<{ password_hash: string }>();
  if (
    !row ||
    !(await verifyPassword(String(b.current_password), row.password_hash))
  )
    return c.json(
      { success: false, message: "Current password is incorrect" },
      401,
    );
  await c.env.DB.prepare("UPDATE clients SET password_hash=? WHERE id=?")
    .bind(await hashPassword(String(b.new_password)), clientId(c))
    .run();
  return c.json({ success: true });
});

app.get("/setup", credentialLimit, async (c) => {
  const row = await findSetupClient(c, c.req.query("token"));
  if (!row)
    return c.json(
      {
        success: false,
        message:
          "This setup link is invalid, expired, or has already been used.",
      },
      400,
    );
  if (row.status !== "active")
    return c.json(
      { success: false, message: "This account is not active." },
      403,
    );
  return c.json({ success: true, client: setupView(row) });
});

app.post("/setup/avatar", credentialLimit, async (c) => {
  const form = await c.req.raw.formData();
  const row = await findSetupClient(c, form.get("token"));
  if (!row)
    return c.json(
      { success: false, message: "This setup link is invalid or has expired." },
      400,
    );
  const value: unknown = form.get("file");
  if (!(value instanceof File))
    return c.json(
      { success: false, message: "Choose a profile image first." },
      400,
    );
  if (!value.type.startsWith("image/") || !isAllowedMime(value.type))
    return c.json(
      { success: false, message: "Profile pictures must be an image." },
      400,
    );
  if (value.size > MAX_UPLOAD_BYTES)
    return c.json({ success: false, message: "File too large" }, 413);
  const key = `clients/${row.id}/profile-${Date.now()}-${safeKey(value.name)}`;
  return c.json({
    success: true,
    url: await putR2(c.env, key, await value.arrayBuffer(), value.type),
  });
});

app.post("/setup", credentialLimit, async (c) => {
  const b = await json(c);
  const name = String(b.name || "").trim();
  const company = String(b.company || "").trim();
  if (name.length < 2)
    return c.json({ success: false, message: "Enter your full name." }, 400);
  if (String(b.password || "").length < 10)
    return c.json(
      { success: false, message: "Password must be at least 10 characters." },
      400,
    );
  const teammateInput = Array.isArray(b.teammates) ? b.teammates : [];
  if (teammateInput.length > 10)
    return c.json(
      {
        success: false,
        message: "You can add up to 10 teammates during setup.",
      },
      400,
    );
  const row = await findSetupClient(c, b.token);
  if (!row)
    return c.json(
      {
        success: false,
        message:
          "This setup link is invalid, expired, or has already been used.",
      },
      400,
    );
  if (row.status !== "active")
    return c.json(
      { success: false, message: "This account is not active." },
      403,
    );
  const seen = new Set<string>();
  const teammates: Array<{ name: string; email: string; role: string }> = [];
  for (const raw of teammateInput as Row[]) {
    const email = String(raw?.email || "")
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    if (!email.includes("@"))
      return c.json(
        {
          success: false,
          message: `Enter a valid email for ${raw?.name || "your teammate"}.`,
        },
        400,
      );
    seen.add(email);
    teammates.push({
      name: String(raw?.name || email.split("@")[0])
        .trim()
        .slice(0, 160),
      email,
      role: String(raw?.role || "Team member")
        .trim()
        .slice(0, 120),
    });
  }
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE clients SET name=?,company=?,phone=?,avatar_url=?,password_hash=?,account_setup_token_hash=NULL,account_setup_expires_at=NULL,account_setup_completed_at=CURRENT_TIMESTAMP WHERE id=? AND account_setup_completed_at IS NULL`,
    ).bind(
      name,
      company || row.company || null,
      String(b.phone || "").trim() || null,
      String(b.avatar_url || "").trim() || null,
      await hashPassword(String(b.password)),
      row.id,
    ),
  ];
  for (const person of teammates)
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO client_contacts (client_id,name,email,role,can_approve,can_bill) VALUES (?,?,?,?,1,0) ON CONFLICT(client_id,email) DO UPDATE SET name=excluded.name,role=excluded.role`,
      ).bind(row.id, person.name, person.email, person.role),
    );
  await c.env.DB.batch(statements);
  const updated = await c.env.DB.prepare(
    `SELECT id,name,email,phone,company,avatar_url,plan,billing,status,subscribed_at,portal_onboarding_version,onboarding_completed_at,account_setup_completed_at FROM clients WHERE id=?`,
  )
    .bind(row.id)
    .first<Row>();
  return c.json({
    success: true,
    token: await signClient(c.env, updated as any),
    client: updated,
  });
});

app.post("/forgot-password", credentialLimit, async (c) => {
  const email = String((await json(c)).email || "")
    .trim()
    .toLowerCase();
  const response = {
    success: true,
    message: "If that email is registered, a reset link has been prepared.",
  };
  if (!email) return c.json(response);
  const row = await c.env.DB.prepare(
    "SELECT id,name FROM clients WHERE LOWER(email)=?",
  )
    .bind(email)
    .first<Row>();
  if (!row) return c.json(response);
  const token = randomToken(24);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE clients SET password_reset_token_hash=?,password_reset_expires_at=datetime('now','+60 minutes') WHERE id=?",
    ).bind(await sha256Hex(token), row.id),
    c.env.DB.prepare(
      "INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Client requested a password reset',?,'/clients')",
    ).bind(
      `${row.name}: share link /reset-password?token=${token} (expires in 60min)`,
    ),
  ]);
  return c.json(response);
});

app.post("/reset-password", credentialLimit, async (c) => {
  const b = await json(c);
  if (!b.token || !b.new_password)
    return c.json(
      { success: false, message: "Token and new password required" },
      400,
    );
  if (String(b.new_password).length < 8)
    return c.json(
      { success: false, message: "Password must be at least 8 characters" },
      400,
    );
  const row = await c.env.DB.prepare(
    `SELECT id,name,email,phone,company,avatar_url,plan,billing,status FROM clients WHERE password_reset_token_hash=? AND password_reset_expires_at IS NOT NULL AND password_reset_expires_at>CURRENT_TIMESTAMP`,
  )
    .bind(await sha256Hex(String(b.token)))
    .first<Row>();
  if (!row)
    return c.json(
      {
        success: false,
        message:
          "This reset link is invalid or has expired. Ask Clockwrk for a fresh one.",
      },
      400,
    );
  if (row.status !== "active")
    return c.json(
      { success: false, message: "This account is not active." },
      403,
    );
  await c.env.DB.prepare(
    "UPDATE clients SET password_hash=?,password_reset_token_hash=NULL,password_reset_expires_at=NULL WHERE id=?",
  )
    .bind(await hashPassword(String(b.new_password)), row.id)
    .run();
  return c.json({
    success: true,
    token: await signClient(c.env, row as any),
    client: row,
  });
});

app.get("/dashboard", requireClient, async (c) => {
  const identity = c.get("client")!;
  const [projects, tickets, invoice, last, recentProjects, recentInvoices] =
    await c.env.DB.batch([
      c.env.DB.prepare(
        "SELECT COUNT(*) AS active_projects FROM projects WHERE client_id=? AND status='active'",
      ).bind(identity.id),
      c.env.DB.prepare(
        "SELECT COUNT(*) AS open_tickets FROM client_tickets WHERE client_id=? AND status IN ('Open','In Progress')",
      ).bind(identity.id),
      c.env.DB.prepare(
        "SELECT COUNT(*) AS unpaid_count,COALESCE(SUM(amount),0) AS unpaid_total FROM payments WHERE email=? AND status='pending'",
      ).bind(identity.email),
      c.env.DB.prepare(
        "SELECT amount,confirmed_at FROM payments WHERE email=? AND status='confirmed' ORDER BY confirmed_at DESC LIMIT 1",
      ).bind(identity.email),
      c.env.DB.prepare(
        "SELECT id,name,status,created_at FROM projects WHERE client_id=? ORDER BY created_at DESC LIMIT 3",
      ).bind(identity.id),
      c.env.DB.prepare(
        "SELECT id,amount,status,submitted_at FROM payments WHERE email=? ORDER BY submitted_at DESC LIMIT 3",
      ).bind(identity.email),
    ]);
  const projectStats = projects!.results[0] as Row | undefined;
  const ticketStats = tickets!.results[0] as Row | undefined;
  const invoiceStats = invoice!.results[0] as Row | undefined;
  const lastPayment = last!.results[0] as Row | undefined;
  return c.json({
    success: true,
    stats: {
      active_projects: projectStats?.active_projects || 0,
      open_tickets: ticketStats?.open_tickets || 0,
      unpaid_count: invoiceStats?.unpaid_count || 0,
      unpaid_total: invoiceStats?.unpaid_total || 0,
      last_payment_amount: lastPayment?.amount || null,
      last_payment_date: lastPayment?.confirmed_at || null,
    },
    recent_projects: recentProjects!.results,
    recent_invoices: recentInvoices!.results,
  });
});

app.route("/", contentRoutes);
app.route("/", requestRoutes);
app.route("/", billingRoutes);

export default app;
