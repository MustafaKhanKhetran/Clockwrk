// Auth middleware for Hono.
//
// Employee tokens and client tokens are signed with the same JWT_SECRET;
// they're kept mutually exclusive by the `type` claim. Both middlewares
// reject the wrong shape so a client can never authenticate against an
// employee-only route (the bug from the original audit).

import type { MiddlewareHandler } from 'hono';
import { verifyToken, isEmployeeClaims, isClientClaims } from '../lib/tokens';
import type { Env, Variables, EmployeeClaims, ClientClaims } from '../types';

const bearer = (h: string | null | undefined) =>
  h?.startsWith('Bearer ') ? h.slice(7).trim() : null;

export const requireEmployee: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const token = bearer(c.req.header('Authorization'));
  if (!token) return c.json({ success: false, message: 'Unauthorized' }, 401);
  try {
    const payload = await verifyToken<Record<string, unknown>>(c.env, token);
    if ((payload as { type?: string }).type === 'client') {
      return c.json({ success: false, message: 'Employee token required' }, 403);
    }
    if (!isEmployeeClaims(payload)) {
      return c.json({ success: false, message: 'Invalid token' }, 401);
    }
    c.set('employee', payload as EmployeeClaims);
    await next();
  } catch {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401);
  }
};

export const requireClient: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const token = bearer(c.req.header('Authorization'));
  if (!token) return c.json({ success: false, message: 'Unauthorized' }, 401);
  try {
    const payload = await verifyToken<Record<string, unknown>>(c.env, token);
    if (!isClientClaims(payload)) {
      return c.json({ success: false, message: 'Client token required' }, 403);
    }
    c.set('client', payload as ClientClaims);
    await next();
  } catch {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401);
  }
};

// Role gate. Applied after `requireEmployee`.
export const requireRoles = (...roles: string[]): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =>
  async (c, next) => {
    const emp = c.get('employee');
    if (!emp || !roles.flat().includes(emp.role)) {
      return c.json({ success: false, message: 'Insufficient permissions' }, 403);
    }
    await next();
  };

export const requireOwner = requireRoles('owner');
