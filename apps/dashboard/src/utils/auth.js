export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'cw_dash_token';
const REFRESH_KEY = 'cw_dash_refresh';
const USER_KEY = 'cw_dash_user';
const LEGACY_TOKEN_KEYS = ['token', 'access_token'];

const storeSession = (data) => {
  const token = data.token || data.access_token || data.accessToken;
  if (!token) throw new Error('Login succeeded without an access token');
  localStorage.setItem(TOKEN_KEY, token);
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  LEGACY_TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
  return data.user;
};

// The login response has two shapes: a normal one (user + token + refresh)
// and a 2FA-gated one (requires_2fa + mfa_token). Callers must handle both.
export const login = async (email, password) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Invalid credentials');
  if (data.requires_2fa) return { requires_2fa: true, mfa_token: data.mfa_token };
  return { user: storeSession(data) };
};

export const submit2faChallenge = async (mfa_token, code) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/2fa/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfa_token, code }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Invalid code');
  return storeSession(data);
};

// Refreshes the access token in-place. Returns the new access token or null.
// Uses a shared in-flight promise so concurrent 401s don't stampede /refresh.
let inflightRefresh = null;
export const refreshSession = () => {
  if (inflightRefresh) return inflightRefresh;
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  if (!refresh_token) return Promise.resolve(null);
  inflightRefresh = fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data?.success) { logout(); return null; }
      storeSession(data);
      return data.token;
    })
    .catch(() => { logout(); return null; })
    .finally(() => { inflightRefresh = null; });
  return inflightRefresh;
};

// Best-effort — revoke server-side and clear local. If the network call fails
// the local wipe still happens so the user is signed out either way.
export const logout = async () => {
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  if (refresh_token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
    } catch {}
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  LEGACY_TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};

export const getToken = () => {
  const stored = localStorage.getItem(TOKEN_KEY)
    || localStorage.getItem('token')
    || localStorage.getItem('access_token');
  if (!stored) return null;
  return stored.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim() || null;
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || null;
export const isAuthenticated = () => !!getToken() && !!getUser();
