import jwt from 'jsonwebtoken';
import db from '../db.js';

const lastSeenCache = new Map();
const LAST_SEEN_THROTTLE_MS = 30 * 1000;

const touchLastSeen = (employeeId) => {
  if (!employeeId) return;
  const now = Date.now();
  const prev = lastSeenCache.get(employeeId) || 0;
  if (now - prev < LAST_SEEN_THROTTLE_MS) return;
  lastSeenCache.set(employeeId, now);
  db.execute('UPDATE employees SET last_seen_at = NOW() WHERE id = ?', [employeeId])
    .catch(err => console.error('last_seen update failed', err));
};

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Client-portal tokens are signed with the same secret; reject them here so
    // a client can never authenticate against employee-only routes.
    if (payload?.type === 'client') {
      return res.status(403).json({ success: false, message: 'Employee token required' });
    }
    req.user = payload;
    touchLastSeen(req.user?.id);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireOwner = (req, res, next) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  next();
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!roles.flat().includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};
