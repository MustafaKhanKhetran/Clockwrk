import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireEmployee, requireRoles } from "../middleware/auth";
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const ACCESS = ["owner", "admin", "finance"];
app.get("/", requireEmployee, requireRoles(...ACCESS), async (c) => {
  const [referrers, conversions, summary] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT r.*,COUNT(rv.id) AS total_conversions,COALESCE(SUM(rv.reward_amount),0) AS total_earned FROM referrers r LEFT JOIN referrals rv ON rv.referrer_id=r.id GROUP BY r.id ORDER BY r.created_at DESC",
    ),
    c.env.DB.prepare(
      "SELECT rv.*,r.name AS referrer_name,r.email AS referrer_email FROM referrals rv LEFT JOIN referrers r ON r.id=rv.referrer_id ORDER BY rv.created_at DESC",
    ),
    c.env.DB.prepare(
      "SELECT COUNT(DISTINCT r.id) AS total_referrers,COUNT(rv.id) AS total_conversions,COALESCE(SUM(rv.reward_amount),0) AS total_rewards_paid FROM referrers r LEFT JOIN referrals rv ON rv.referrer_id=r.id",
    ),
  ]);
  return c.json({
    success: true,
    referrers: referrers?.results ?? [],
    conversions: conversions?.results ?? [],
    summary: summary?.results?.[0] ?? {},
  });
});
app.post(
  "/conversions/:id/mark-paid",
  requireEmployee,
  requireRoles(...ACCESS),
  async (c) => {
    await c.env.DB.prepare(
      "UPDATE referrals SET status='paid',rewarded_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(c.req.param("id"))
      .run();
    return c.json({ success: true });
  },
);
export default app;
