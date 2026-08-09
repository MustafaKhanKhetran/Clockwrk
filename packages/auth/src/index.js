export class AuthError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.payload = payload;
  }
}

const browserStorage = () => (typeof window === 'undefined' ? null : window.localStorage);
const cleanToken = (value) => value?.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim() || null;

export function createAuthClient({ apiBase, tokenKey, refreshKey = null, userKey, legacyTokenKeys = [], persistLogin = true, endpoints = {} }) {
  const paths = { login: '/login', challenge: '/2fa/challenge', refresh: '/refresh', logout: '/logout', ...endpoints };
  let inflightRefresh = null;
  const storage = () => browserStorage();
  const url = (path) => `${apiBase.replace(/\/$/, '')}${path}`;

  const clearSession = () => {
    const target = storage();
    if (!target) return;
    [tokenKey, refreshKey, userKey, ...legacyTokenKeys].filter(Boolean).forEach((key) => target.removeItem(key));
  };

  const setSession = (tokenOrPayload, explicitUser) => {
    const target = storage();
    const payload = typeof tokenOrPayload === 'string' ? { token: tokenOrPayload, user: explicitUser } : tokenOrPayload;
    const token = payload?.token || payload?.access_token || payload?.accessToken;
    if (!token) throw new AuthError('Login succeeded without an access token');
    if (!target) return payload.user || explicitUser || null;
    target.setItem(tokenKey, cleanToken(token));
    if (refreshKey && payload.refresh_token) target.setItem(refreshKey, payload.refresh_token);
    if (userKey && payload.user) target.setItem(userKey, JSON.stringify(payload.user));
    legacyTokenKeys.forEach((key) => target.removeItem(key));
    return payload.user || explicitUser || null;
  };

  const post = async (path, body) => {
    const response = await fetch(url(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) throw new AuthError(data?.message || `Authentication failed (${response.status})`, response.status, data);
    return data;
  };

  const login = async (email, password) => {
    const data = await post(paths.login, { email, password });
    if (data?.requires_2fa) return { requires_2fa: true, mfa_token: data.mfa_token };
    return persistLogin ? { ...data, user: setSession(data) } : data;
  };

  const submit2faChallenge = async (mfa_token, code) => {
    if (!paths.challenge) throw new AuthError('Two-factor authentication is not configured');
    const data = await post(paths.challenge, { mfa_token, code });
    return persistLogin ? setSession(data) : data;
  };

  const getToken = () => {
    const target = storage();
    if (!target) return null;
    return cleanToken([tokenKey, ...legacyTokenKeys].map((key) => target.getItem(key)).find(Boolean));
  };
  const getRefreshToken = () => refreshKey ? storage()?.getItem(refreshKey) || null : null;
  const getUser = () => { try { return JSON.parse(storage()?.getItem(userKey) || 'null'); } catch { return null; } };

  const logout = async () => {
    const refresh_token = getRefreshToken();
    if (refresh_token && paths.logout) {
      try { await post(paths.logout, { refresh_token }); } catch { /* Local logout must still complete. */ }
    }
    clearSession();
  };

  const refreshSession = () => {
    if (inflightRefresh) return inflightRefresh;
    const refresh_token = getRefreshToken();
    if (!refresh_token || !paths.refresh) return Promise.resolve(null);
    inflightRefresh = post(paths.refresh, { refresh_token })
      .then((data) => { setSession(data); return getToken(); })
      .catch(() => { clearSession(); return null; })
      .finally(() => { inflightRefresh = null; });
    return inflightRefresh;
  };

  return { login, submit2faChallenge, refreshSession, logout, getToken, getRefreshToken, getUser, setSession, clearSession, isAuthenticated: () => !!getToken() && (!persistLogin || !!getUser()) };
}
