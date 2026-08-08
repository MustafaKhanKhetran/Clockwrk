import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, requireOwner, async (req, res) => {
  const { query: sql } = req.body;
  if (!sql) return res.status(400).json({ success: false, message: 'Query required' });
  try {
    const [rows] = await db.execute(sql);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
