import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }
  try {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const [rows] = await db.execute(
      `SELECT id, name, email, role, department, level, status, avatar_url
       FROM employees
       WHERE email = ? AND password_hash = ? AND status = 'active'
       LIMIT 1`,
      [email, hash]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ success: true, user, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
