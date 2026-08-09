// JWT signing/verification and refresh-token helpers.
//
// Access tokens are short (15 min) so a stolen bearer stops working fast.
// Refresh tokens are opaque 32-byte random strings, sha256-hashed at rest
// in auth_sessions, and rotate on every /refresh call — replaying an old
// refresh returns 401 immediately.

import { SignJWT, jwtVerify } from 'jose';
import type { Env, EmployeeClaims, ClientClaims, MfaPendingClaims } from '../types';

const ACCESS_TTL_SECONDS = 15 * 60;
const MFA_PENDING_TTL_SECONDS = 5 * 60;
const CLIENT_TTL_SECONDS = 7 * 24 * 60 * 60;
export const REFRESH_TTL_DAYS = 30;

const encoder = new TextEncoder();
const key = (secret: string) => encoder.encode(secret);

export async function signAccess(env: Env, e: { id: number; email: string; role: string }) {
  return new SignJWT({ id: e.id, email: e.email, role: e.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS)
    .sign(key(env.JWT_SECRET));
}

export async function signMfaPending(env: Env, employeeId: number) {
  return new SignJWT({ type: 'mfa_pending', id: employeeId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MFA_PENDING_TTL_SECONDS)
    .sign(key(env.JWT_SECRET));
}

export async function signClient(env: Env, c: {
  id: number; email: string; name: string; company: string | null; plan: string | null;
}) {
  return new SignJWT({ type: 'client', id: c.id, email: c.email, name: c.name, company: c.company, plan: c.plan })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + CLIENT_TTL_SECONDS)
    .sign(key(env.JWT_SECRET));
}

export async function verifyToken<T extends Record<string, unknown>>(env: Env, token: string): Promise<T> {
  const { payload } = await jwtVerify(token, key(env.JWT_SECRET), { algorithms: ['HS256'] });
  return payload as T;
}

// SHA-256 hex of an opaque token. Used for refresh tokens and setup/reset
// tokens so a DB leak alone can't hijack a session.
export async function sha256Hex(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// URL-safe base64 of N random bytes (no padding). Used for refresh tokens,
// reset tokens, invite tokens — anywhere we need "opaque random string".
export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let s = btoa(String.fromCharCode(...arr));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isEmployeeClaims(p: unknown): p is EmployeeClaims {
  return !!p && typeof p === 'object' && 'id' in p && !('type' in p);
}

export function isClientClaims(p: unknown): p is ClientClaims {
  return !!p && typeof p === 'object' && (p as { type?: string }).type === 'client';
}

export function isMfaPending(p: unknown): p is MfaPendingClaims {
  return !!p && typeof p === 'object' && (p as { type?: string }).type === 'mfa_pending';
}
