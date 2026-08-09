import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }
  try {
    const [[employee]] = await db.execute(
      `SELECT id, name, email, role, department, level, status, avatar_url, password_hash
         FROM employees WHERE email = ? AND status = 'active' LIMIT 1`,
      [email]
    );
    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    const isBcrypt = employee.password_hash?.startsWith('$2');
    const valid = isBcrypt
      ? await bcrypt.compare(password, employee.password_hash)
      : employee.password_hash === legacyHash;
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!isBcrypt) {
      await db.execute('UPDATE employees SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 12), employee.id]);
    }
    const { password_hash, ...user } = employee;
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

router.post('/setup-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 10) {
    return res.status(400).json({ success: false, message: 'A valid invite and a password of at least 10 characters are required.' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const [[employee]] = await db.execute(
      `SELECT id FROM employees
        WHERE password_setup_token_hash = ? AND password_setup_expires_at > NOW() LIMIT 1`,
      [tokenHash]
    );
    if (!employee) return res.status(400).json({ success: false, message: 'This setup link is invalid or expired.' });
    await db.execute(
      `UPDATE employees SET password_hash = ?, status = 'active', password_setup_token_hash = NULL,
       password_setup_expires_at = NULL WHERE id = ?`,
      [await bcrypt.hash(String(password), 12), employee.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Password setup error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
