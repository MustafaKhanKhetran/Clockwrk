import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const COMMS_ACCESS = ['owner','admin','marketing_manager','content_writer','social_media_manager'];

router.get('/', authenticate, requireRoles(COMMS_ACCESS), async (req, res) => {
  try {
    const [subscribers] = await db.execute(
      `SELECT id, email, type, source, status, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC`
    );
    return res.json({ success: true, subscribers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/unsubscribe', authenticate, requireRoles(COMMS_ACCESS), async (req, res) => {
  try {
    await db.execute(`UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE id = ?`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
