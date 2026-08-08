import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [alerts] = await db.execute(
      `SELECT id, type, title, message, link, is_read, created_at FROM dashboard_alerts ORDER BY created_at DESC LIMIT 50`
    );
    // Counted across all alerts, not just the 50 returned — the dashboard header
    // reads this and was permanently showing "0 unread" without it.
    const [[{ unread_count }]] = await db.execute(
      'SELECT COUNT(*) AS unread_count FROM dashboard_alerts WHERE is_read = 0'
    );
    return res.json({ success: true, alerts, unread_count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.execute('UPDATE dashboard_alerts SET is_read = 1 WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    await db.execute('UPDATE dashboard_alerts SET is_read = 1');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/clear-read', authenticate, async (req, res) => {
  try {
    await db.execute('DELETE FROM dashboard_alerts WHERE is_read = 1');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
