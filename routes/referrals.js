import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const FINANCE_ACCESS = ['owner', 'admin', 'finance'];

router.get('/', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    const [referrers] = await db.execute(
      `SELECT r.*, COUNT(rv.id) AS total_conversions, COALESCE(SUM(rv.reward_amount),0) AS total_earned
       FROM referrers r LEFT JOIN referrals rv ON rv.referrer_id = r.id
       GROUP BY r.id ORDER BY r.created_at DESC`
    );
    const [conversions] = await db.execute(
      `SELECT rv.*, r.name AS referrer_name, r.email AS referrer_email
       FROM referrals rv LEFT JOIN referrers r ON r.id = rv.referrer_id
       ORDER BY rv.created_at DESC`
    );
    const [[summary]] = await db.execute(
      `SELECT COUNT(DISTINCT r.id) AS total_referrers, COUNT(rv.id) AS total_conversions,
        COALESCE(SUM(rv.reward_amount),0) AS total_rewards_paid
       FROM referrers r LEFT JOIN referrals rv ON rv.referrer_id = r.id`
    );
    return res.json({ success: true, referrers, conversions, summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/conversions/:id/mark-paid', authenticate, requireRoles(FINANCE_ACCESS), async (req, res) => {
  try {
    await db.execute(`UPDATE referrals SET status = 'paid', rewarded_at = NOW() WHERE id = ?`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
