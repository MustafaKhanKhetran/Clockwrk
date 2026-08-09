// Auth routes — login, refresh, logout, 2FA setup/enable/disable/challenge,
// sessions list/revoke, employee /me, invite-based setup-password.
//
// Ported from the Express routes/auth.js. Behaviour intentionally matches so
// the dashboard's existing auth flow keeps working without URL changes.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types';
import { requireEmployee } from '../middleware/auth';
import { ipRateLimit } from '../middleware/rateLimit';
import {
  signAccess, signMfaPending, verifyToken, sha256Hex, randomToken,
  isMfaPending, REFRESH_TTL_DAYS,
} from '../lib/tokens';
import { verifyPassword, hashPassword, hashPasswordSync, verifyPasswordSync } from '../lib/passwords';
import { totpFor, generateSecret, provisioningUri } from '../lib/totp';
import { parseJson, futureIso, futureIsoMinutes } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const credentialLimit = ipRateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth' });

type EmployeeRow = {
  id: number; name: string; email: string; role: string;
  department: string | null; level: string | null; status: string;
  avatar_url: string | null; password_hash: string;
  two_factor_enabled: number; two_factor_secret: string | null;
  two_factor_backup_codes: string | null;
};

const userResponse = (e: Partial<EmployeeRow>) => ({
  id: e.id, name: e.name, email: e.email, role: e.role,
  department: e.department, level: e.level, status: e.status,
  avatar_url: e.avatar_url,
  two_factor_enabled: !!e.two_factor_enabled,
});

async function issueSession(
  env: Env, req: Request,
  employee: { id: number; email: string; role: string }
) {
  const raw = randomToken(32);
  const hash = await sha256Hex(raw);
  const ua = (req.headers.get('user-agent') || '').slice(0, 255);
  const ip = (req.headers.get('cf-connecting-ip') || '').slice(0, 64);
  await env.DB.prepare(
    `INSERT INTO auth_sessions (employee_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(employee.id, hash, ua, ip, futureIso(REFRESH_TTL_DAYS)).run();
  return { token: await signAccess(env, employee), refresh_token: raw };
}

// ─── LOGIN ────────────────────────────────────────────────────────
app.post('/login', credentialLimit, zValidator('json', z.object({
  email: z.string().email(),
  password: z.string().min(1),
})), async (c) => {
  const { email, password } = c.req.valid('json');
  const employee = await c.env.DB.prepare(
    `SELECT id, name, email, role, department, level, status, avatar_url, password_hash,
            two_factor_enabled, two_factor_secret
       FROM employees WHERE email = ? AND status = 'active' LIMIT 1`
  ).bind(email).first<EmployeeRow>();

  if (!employee || !employee.password_hash?.startsWith('$2')) {
    return c.json({ success: false, message: 'Invalid credentials' }, 401);
  }
  if (!await verifyPassword(password, employee.password_hash)) {
    return c.json({ success: false, message: 'Invalid credentials' }, 401);
  }

  if (employee.two_factor_enabled && employee.two_factor_secret) {
    return c.json({
      success: true,
      requires_2fa: true,
      mfa_token: await signMfaPending(c.env, employee.id),
    });
  }

  const session = await issueSession(c.env, c.req.raw, employee);
  return c.json({ success: true, user: userResponse(employee), ...session });
});

// ─── 2FA CHALLENGE ─────────────────────────────────────────────────
app.post('/2fa/challenge', credentialLimit, zValidator('json', z.object({
  mfa_token: z.string(),
  code: z.string(),
})), async (c) => {
  const { mfa_token, code } = c.req.valid('json');
  let payload;
  try { payload = await verifyToken<Record<string, unknown>>(c.env, mfa_token); }
  catch { return c.json({ success: false, message: 'MFA challenge expired — sign in again' }, 401); }
  if (!isMfaPending(payload)) return c.json({ success: false, message: 'Invalid MFA token' }, 401);

  const employee = await c.env.DB.prepare(
    `SELECT id, name, email, role, department, level, status, avatar_url,
            two_factor_enabled, two_factor_secret, two_factor_backup_codes
       FROM employees WHERE id = ? AND status = 'active' LIMIT 1`
  ).bind(payload.id).first<EmployeeRow>();
  if (!employee?.two_factor_enabled || !employee.two_factor_secret) {
    return c.json({ success: false, message: 'Invalid MFA token' }, 401);
  }

  const raw = String(code).replace(/[-\s]/g, '').trim();
  let ok = false;

  if (/^\d{6}$/.test(raw)) {
    ok = totpFor(employee.email, employee.two_factor_secret).validate({ token: raw, window: 1 }) !== null;
  }

  if (!ok && employee.two_factor_backup_codes) {
    const codes = parseJson<string[]>(employee.two_factor_backup_codes, []);
    const idx = codes.findIndex(hashed => verifyPasswordSync(raw, hashed));
    if (idx !== -1) {
      codes.splice(idx, 1);
      await c.env.DB.prepare('UPDATE employees SET two_factor_backup_codes = ? WHERE id = ?')
        .bind(JSON.stringify(codes), employee.id).run();
      ok = true;
    }
  }

  if (!ok) return c.json({ success: false, message: 'Invalid code' }, 401);

  const session = await issueSession(c.env, c.req.raw, employee);
  return c.json({ success: true, user: userResponse(employee), ...session });
});

// ─── REFRESH ───────────────────────────────────────────────────────
// Rotates on every use. Reusing an old refresh token returns 401. Executed
// as a batched atomic operation because D1 has no per-row locking.
app.post('/refresh', zValidator('json', z.object({ refresh_token: z.string() })), async (c) => {
  const { refresh_token } = c.req.valid('json');
  const hash = await sha256Hex(refresh_token);
  const session = await c.env.DB.prepare(
    `SELECT s.id, s.employee_id, s.expires_at, s.revoked_at,
            e.id AS emp_id, e.name, e.email, e.role, e.department, e.level, e.status, e.avatar_url,
            e.two_factor_enabled
       FROM auth_sessions s JOIN employees e ON e.id = s.employee_id
      WHERE s.refresh_token_hash = ? LIMIT 1`
  ).bind(hash).first<Record<string, unknown>>();

  if (!session || session.revoked_at !== null
    || new Date(session.expires_at as string) < new Date()
    || session.status !== 'active') {
    return c.json({ success: false, message: 'Invalid or expired refresh token' }, 401);
  }

  const raw = randomToken(32);
  const newHash = await sha256Hex(raw);
  const ua = (c.req.header('user-agent') || '').slice(0, 255);
  const ip = (c.req.header('cf-connecting-ip') || '').slice(0, 64);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').bind(session.id),
    c.env.DB.prepare(
      `INSERT INTO auth_sessions (employee_id, refresh_token_hash, user_agent, ip, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(session.employee_id, newHash, ua, ip, futureIso(REFRESH_TTL_DAYS)),
  ]);

  const employee = {
    id: session.emp_id as number, name: session.name as string, email: session.email as string,
    role: session.role as string, department: session.department as string | null,
    level: session.level as string | null, status: session.status as string,
    avatar_url: session.avatar_url as string | null,
    two_factor_enabled: session.two_factor_enabled as number,
  };
  return c.json({
    success: true,
    token: await signAccess(c.env, employee),
    refresh_token: raw,
    user: userResponse(employee),
  });
});

// ─── LOGOUT ────────────────────────────────────────────────────────
app.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { refresh_token?: string };
  if (body.refresh_token) {
    await c.env.DB.prepare(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
        WHERE refresh_token_hash = ? AND revoked_at IS NULL`
    ).bind(await sha256Hex(body.refresh_token)).run();
  }
  return c.json({ success: true });
});

// ─── SESSIONS ──────────────────────────────────────────────────────
app.get('/sessions', requireEmployee, async (c) => {
  const emp = c.get('employee')!;
  const { results } = await c.env.DB.prepare(
    `SELECT id, user_agent, ip, created_at, last_used_at, expires_at
       FROM auth_sessions
      WHERE employee_id = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC`
  ).bind(emp.id).all();
  return c.json({ success: true, sessions: results });
});

app.delete('/sessions/:id', requireEmployee, async (c) => {
  const emp = c.get('employee')!;
  await c.env.DB.prepare(
    `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = ? AND employee_id = ? AND revoked_at IS NULL`
  ).bind(c.req.param('id'), emp.id).run();
  return c.json({ success: true });
});

app.post('/sessions/revoke-others', requireEmployee, async (c) => {
  const emp = c.get('employee')!;
  const body = await c.req.json().catch(() => ({})) as { keep_refresh_token?: string };
  const keepHash = body.keep_refresh_token ? await sha256Hex(body.keep_refresh_token) : null;
  if (keepHash) {
    await c.env.DB.prepare(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND revoked_at IS NULL AND refresh_token_hash != ?`
    ).bind(emp.id, keepHash).run();
  } else {
    await c.env.DB.prepare(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND revoked_at IS NULL`
    ).bind(emp.id).run();
  }
  return c.json({ success: true });
});

// ─── 2FA SETUP ─────────────────────────────────────────────────────
app.post('/2fa/setup', requireEmployee, zValidator('json', z.object({ password: z.string() })), async (c) => {
  const emp = c.get('employee')!;
  const { password } = c.req.valid('json');
  const employee = await c.env.DB.prepare(
    'SELECT id, email, password_hash, two_factor_enabled FROM employees WHERE id = ?'
  ).bind(emp.id).first<Pick<EmployeeRow, 'id' | 'email' | 'password_hash' | 'two_factor_enabled'>>();
  if (!employee) return c.json({ success: false, message: 'Not found' }, 404);
  if (!await verifyPassword(password, employee.password_hash)) {
    return c.json({ success: false, message: 'Wrong password' }, 401);
  }
  if (employee.two_factor_enabled) {
    return c.json({ success: false, message: '2FA already enabled — disable it first to re-provision' }, 400);
  }
  const secret = generateSecret();
  await c.env.DB.prepare('UPDATE employees SET two_factor_secret = ? WHERE id = ?')
    .bind(secret.base32, employee.id).run();
  return c.json({ success: true, otpauth_url: provisioningUri(employee.email, secret), secret: secret.base32 });
});

app.post('/2fa/enable', requireEmployee, zValidator('json', z.object({
  code: z.string().regex(/^\d{6}$/, '6-digit code required'),
})), async (c) => {
  const emp = c.get('employee')!;
  const { code } = c.req.valid('json');
  const employee = await c.env.DB.prepare(
    'SELECT id, email, two_factor_secret, two_factor_enabled FROM employees WHERE id = ?'
  ).bind(emp.id).first<Pick<EmployeeRow, 'id' | 'email' | 'two_factor_secret' | 'two_factor_enabled'>>();
  if (!employee?.two_factor_secret) return c.json({ success: false, message: 'Start setup first' }, 400);
  if (employee.two_factor_enabled) return c.json({ success: false, message: 'Already enabled' }, 400);
  if (totpFor(employee.email, employee.two_factor_secret).validate({ token: code, window: 1 }) === null) {
    return c.json({ success: false, message: 'Invalid code' }, 401);
  }

  const rawCodes = Array.from({ length: 10 }, () => {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  const hashed = rawCodes.map(c => hashPasswordSync(c));
  await c.env.DB.prepare(
    `UPDATE employees SET two_factor_enabled = 1, two_factor_verified_at = CURRENT_TIMESTAMP,
            two_factor_backup_codes = ? WHERE id = ?`
  ).bind(JSON.stringify(hashed), employee.id).run();
  return c.json({ success: true, backup_codes: rawCodes });
});

app.post('/2fa/disable', requireEmployee, zValidator('json', z.object({
  password: z.string(), code: z.string(),
})), async (c) => {
  const emp = c.get('employee')!;
  const { password, code } = c.req.valid('json');
  const employee = await c.env.DB.prepare(
    'SELECT id, email, password_hash, two_factor_secret, two_factor_enabled FROM employees WHERE id = ?'
  ).bind(emp.id).first<Pick<EmployeeRow, 'id' | 'email' | 'password_hash' | 'two_factor_secret' | 'two_factor_enabled'>>();
  if (!employee?.two_factor_enabled || !employee.two_factor_secret) {
    return c.json({ success: false, message: '2FA is not enabled' }, 400);
  }
  if (!await verifyPassword(password, employee.password_hash)) {
    return c.json({ success: false, message: 'Wrong password' }, 401);
  }
  if (totpFor(employee.email, employee.two_factor_secret)
    .validate({ token: String(code).replace(/\s/g, ''), window: 1 }) === null) {
    return c.json({ success: false, message: 'Invalid code' }, 401);
  }
  await c.env.DB.prepare(
    `UPDATE employees SET two_factor_enabled = 0, two_factor_secret = NULL,
            two_factor_verified_at = NULL, two_factor_backup_codes = NULL WHERE id = ?`
  ).bind(employee.id).run();
  return c.json({ success: true });
});

// ─── ME ────────────────────────────────────────────────────────────
app.get('/me', requireEmployee, async (c) => {
  const emp = c.get('employee')!;
  const employee = await c.env.DB.prepare(
    `SELECT id, name, email, role, department, level, status, avatar_url, two_factor_enabled
       FROM employees WHERE id = ? LIMIT 1`
  ).bind(emp.id).first<EmployeeRow>();
  if (!employee) return c.json({ success: false, message: 'Not found' }, 404);
  return c.json({ success: true, user: userResponse(employee) });
});

// ─── SETUP-PASSWORD (invite link) ──────────────────────────────────
app.post('/setup-password', zValidator('json', z.object({
  token: z.string(),
  password: z.string().min(10, 'A valid invite and a password of at least 10 characters are required.'),
})), async (c) => {
  const { token, password } = c.req.valid('json');
  const tokenHash = await sha256Hex(token);
  const employee = await c.env.DB.prepare(
    `SELECT id FROM employees
      WHERE password_setup_token_hash = ? AND password_setup_expires_at > CURRENT_TIMESTAMP LIMIT 1`
  ).bind(tokenHash).first<{ id: number }>();
  if (!employee) return c.json({ success: false, message: 'This setup link is invalid or expired.' }, 400);
  await c.env.DB.prepare(
    `UPDATE employees SET password_hash = ?, status = 'active',
            password_setup_token_hash = NULL, password_setup_expires_at = NULL WHERE id = ?`
  ).bind(await hashPassword(password), employee.id).run();
  return c.json({ success: true });
});

export default app;
