import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { TOTP, Secret } from 'otpauth';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Strict credential limiter — only on /login and /2fa/challenge so brute-force
// is throttled without also strangling /refresh and /me.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Access tokens are short-lived so a stolen bearer stops working quickly.
// Refresh tokens carry the long tail and can be revoked out-of-band from
// auth_sessions — either by the user or an admin.
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;
const MFA_PENDING_TTL_SECONDS = 5 * 60;
const ISSUER = 'Clockwrk';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const signAccess = (employee) => jwt.sign(
  { id: employee.id, email: employee.email, role: employee.role },
  process.env.JWT_SECRET,
  { expiresIn: ACCESS_TTL_SECONDS }
);

const signMfaPending = (employeeId) => jwt.sign(
  { type: 'mfa_pending', id: employeeId },
  process.env.JWT_SECRET,
  { expiresIn: MFA_PENDING_TTL_SECONDS }
);

const totpFor = (employee) => new TOTP({
  issuer: ISSUER, label: employee.email, algorithm: 'SHA1',
  digits: 6, period: 30, secret: Secret.fromBase32(employee.two_factor_secret),
});

async function issueSession(employee, req) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const ua = String(req.headers['user-agent'] || '').slice(0, 255);
  const ip = String(req.ip || '').slice(0, 64);
  await db.execute(
    `INSERT INTO auth_sessions (employee_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [employee.id, hashToken(raw), ua, ip, REFRESH_TTL_DAYS]
  );
  return { token: signAccess(employee), refresh_token: raw };
}

const userResponse = (employee) => ({
  id: employee.id, name: employee.name, email: employee.email,
  role: employee.role, department: employee.department, level: employee.level,
  status: employee.status, avatar_url: employee.avatar_url,
  two_factor_enabled: !!employee.two_factor_enabled,
});

// ─── LOGIN ──────────────────────────────────────────────────────────
router.post('/login', credentialLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }
  try {
    const [[employee]] = await db.execute(
      `SELECT id, name, email, role, department, level, status, avatar_url,
              password_hash, two_factor_enabled, two_factor_secret
         FROM employees WHERE email = ? AND status = 'active' LIMIT 1`,
      [email]
    );
    if (!employee || !employee.password_hash?.startsWith('$2')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, employee.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (employee.two_factor_enabled && employee.two_factor_secret) {
      return res.json({ success: true, requires_2fa: true, mfa_token: signMfaPending(employee.id) });
    }

    const session = await issueSession(employee, req);
    return res.json({ success: true, user: userResponse(employee), ...session });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── 2FA CHALLENGE (second step of login) ───────────────────────────
router.post('/2fa/challenge', credentialLimiter, async (req, res) => {
  const { mfa_token, code } = req.body || {};
  if (!mfa_token || !code) return res.status(400).json({ success: false, message: 'mfa_token and code required' });
  try {
    let payload;
    try { payload = jwt.verify(mfa_token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'MFA challenge expired — sign in again' }); }
    if (payload?.type !== 'mfa_pending') {
      return res.status(401).json({ success: false, message: 'Invalid MFA token' });
    }

    const [[employee]] = await db.execute(
      `SELECT id, name, email, role, department, level, status, avatar_url,
              two_factor_enabled, two_factor_secret, two_factor_backup_codes
         FROM employees WHERE id = ? AND status = 'active' LIMIT 1`,
      [payload.id]
    );
    if (!employee?.two_factor_enabled) return res.status(401).json({ success: false, message: 'Invalid MFA token' });

    const raw = String(code).replace(/[-\s]/g, '').trim();
    let ok = false;

    if (/^\d{6}$/.test(raw)) {
      ok = totpFor(employee).validate({ token: raw, window: 1 }) !== null;
    }

    if (!ok && employee.two_factor_backup_codes) {
      const codes = Array.isArray(employee.two_factor_backup_codes)
        ? employee.two_factor_backup_codes
        : JSON.parse(employee.two_factor_backup_codes);
      const idx = codes.findIndex(hashed => bcrypt.compareSync(raw, hashed));
      if (idx !== -1) {
        codes.splice(idx, 1);
        await db.execute('UPDATE employees SET two_factor_backup_codes = ? WHERE id = ?',
          [JSON.stringify(codes), employee.id]);
        ok = true;
      }
    }

    if (!ok) return res.status(401).json({ success: false, message: 'Invalid code' });

    const session = await issueSession(employee, req);
    return res.json({ success: true, user: userResponse(employee), ...session });
  } catch (err) {
    console.error('2FA challenge error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── REFRESH ────────────────────────────────────────────────────────
// Rotates on every use: the presented refresh token is immediately revoked
// and a new one issued. Reusing an old refresh token returns 401.
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ success: false, message: 'refresh_token required' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[session]] = await conn.execute(
      `SELECT s.id, s.employee_id, s.expires_at, s.revoked_at,
              e.id AS emp_id, e.name, e.email, e.role, e.department, e.level, e.status, e.avatar_url,
              e.two_factor_enabled
         FROM auth_sessions s JOIN employees e ON e.id = s.employee_id
        WHERE s.refresh_token_hash = ? LIMIT 1 FOR UPDATE`,
      [hashToken(refresh_token)]
    );
    if (!session || session.revoked_at || new Date(session.expires_at) < new Date() || session.status !== 'active') {
      await conn.rollback();
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    await conn.execute('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ?', [session.id]);

    const raw = crypto.randomBytes(32).toString('base64url');
    const ua = String(req.headers['user-agent'] || '').slice(0, 255);
    const ip = String(req.ip || '').slice(0, 64);
    await conn.execute(
      `INSERT INTO auth_sessions (employee_id, refresh_token_hash, user_agent, ip, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [session.employee_id, hashToken(raw), ua, ip, REFRESH_TTL_DAYS]
    );
    await conn.commit();

    const employee = {
      id: session.emp_id, name: session.name, email: session.email, role: session.role,
      department: session.department, level: session.level, status: session.status,
      avatar_url: session.avatar_url, two_factor_enabled: session.two_factor_enabled,
    };
    return res.json({
      success: true,
      token: signAccess(employee),
      refresh_token: raw,
      user: userResponse(employee),
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('Refresh error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// ─── LOGOUT ─────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (refresh_token) {
    try {
      await db.execute(
        'UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = ? AND revoked_at IS NULL',
        [hashToken(refresh_token)]
      );
    } catch (err) { console.error('Logout error:', err); }
  }
  return res.json({ success: true });
});

// ─── SESSIONS ──────────────────────────────────────────────────────
router.get('/sessions', authenticate, async (req, res) => {
  const [rows] = await db.execute(
    `SELECT id, user_agent, ip, created_at, last_used_at, expires_at
       FROM auth_sessions
      WHERE employee_id = ? AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [req.user.id]
  );
  return res.json({ success: true, sessions: rows });
});

router.delete('/sessions/:id', authenticate, async (req, res) => {
  await db.execute(
    'UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ? AND employee_id = ? AND revoked_at IS NULL',
    [req.params.id, req.user.id]
  );
  return res.json({ success: true });
});

// Revoke every other session — useful after enabling 2FA or a password change.
router.post('/sessions/revoke-others', authenticate, async (req, res) => {
  const { keep_refresh_token } = req.body || {};
  const keepHash = keep_refresh_token ? hashToken(keep_refresh_token) : null;
  await db.execute(
    `UPDATE auth_sessions SET revoked_at = NOW()
      WHERE employee_id = ? AND revoked_at IS NULL
        AND (? IS NULL OR refresh_token_hash != ?)`,
    [req.user.id, keepHash, keepHash]
  );
  return res.json({ success: true });
});

// ─── 2FA SETUP ──────────────────────────────────────────────────────
router.post('/2fa/setup', authenticate, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });
  try {
    const [[employee]] = await db.execute(
      'SELECT id, email, password_hash, two_factor_enabled FROM employees WHERE id = ?',
      [req.user.id]
    );
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
    if (!(await bcrypt.compare(password, employee.password_hash))) {
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }
    if (employee.two_factor_enabled) {
      return res.status(400).json({ success: false, message: '2FA already enabled — disable it first to re-provision' });
    }
    const secret = new Secret({ size: 20 });
    await db.execute('UPDATE employees SET two_factor_secret = ? WHERE id = ?', [secret.base32, employee.id]);
    const totp = new TOTP({
      issuer: ISSUER, label: employee.email, algorithm: 'SHA1',
      digits: 6, period: 30, secret,
    });
    return res.json({ success: true, otpauth_url: totp.toString(), secret: secret.base32 });
  } catch (err) { console.error('2FA setup:', err); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/2fa/enable', authenticate, async (req, res) => {
  const { code } = req.body || {};
  if (!/^\d{6}$/.test(String(code || ''))) {
    return res.status(400).json({ success: false, message: '6-digit code required' });
  }
  try {
    const [[employee]] = await db.execute(
      'SELECT id, email, two_factor_secret, two_factor_enabled FROM employees WHERE id = ?',
      [req.user.id]
    );
    if (!employee?.two_factor_secret) {
      return res.status(400).json({ success: false, message: 'Start setup first' });
    }
    if (employee.two_factor_enabled) {
      return res.status(400).json({ success: false, message: 'Already enabled' });
    }
    if (totpFor(employee).validate({ token: String(code), window: 1 }) === null) {
      return res.status(401).json({ success: false, message: 'Invalid code' });
    }

    // 10 single-use backup codes, bcrypt-hashed at rest.
    const rawCodes = Array.from({ length: 10 }, () => {
      const hex = crypto.randomBytes(5).toString('hex');
      return `${hex.slice(0, 5)}-${hex.slice(5)}`;
    });
    const hashed = rawCodes.map(c => bcrypt.hashSync(c, 10));
    await db.execute(
      `UPDATE employees SET two_factor_enabled = 1, two_factor_verified_at = NOW(),
              two_factor_backup_codes = ? WHERE id = ?`,
      [JSON.stringify(hashed), employee.id]
    );
    return res.json({ success: true, backup_codes: rawCodes });
  } catch (err) { console.error('2FA enable:', err); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/2fa/disable', authenticate, async (req, res) => {
  const { password, code } = req.body || {};
  if (!password || !code) return res.status(400).json({ success: false, message: 'Password and current code required' });
  try {
    const [[employee]] = await db.execute(
      'SELECT id, email, password_hash, two_factor_secret, two_factor_enabled FROM employees WHERE id = ?',
      [req.user.id]
    );
    if (!employee?.two_factor_enabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });
    if (!(await bcrypt.compare(password, employee.password_hash))) {
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }
    if (totpFor(employee).validate({ token: String(code).replace(/\s/g, ''), window: 1 }) === null) {
      return res.status(401).json({ success: false, message: 'Invalid code' });
    }
    await db.execute(
      `UPDATE employees
          SET two_factor_enabled = 0, two_factor_secret = NULL,
              two_factor_verified_at = NULL, two_factor_backup_codes = NULL
        WHERE id = ?`,
      [employee.id]
    );
    return res.json({ success: true });
  } catch (err) { console.error('2FA disable:', err); return res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── ME ────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const [[employee]] = await db.execute(
    `SELECT id, name, email, role, department, level, status, avatar_url, two_factor_enabled
       FROM employees WHERE id = ? LIMIT 1`,
    [req.user.id]
  );
  if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
  return res.json({ success: true, user: userResponse(employee) });
});

// ─── SETUP-PASSWORD (invite link) ──────────────────────────────────
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
