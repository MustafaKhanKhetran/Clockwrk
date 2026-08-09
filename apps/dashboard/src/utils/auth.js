import { createAuthClient } from '@clockwrk/auth';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const auth = createAuthClient({
  apiBase: `${API_BASE_URL}/api/auth`,
  tokenKey: 'cw_dash_token',
  refreshKey: 'cw_dash_refresh',
  userKey: 'cw_dash_user',
  legacyTokenKeys: ['token', 'access_token'],
});

export const login = auth.login;
export const submit2faChallenge = auth.submit2faChallenge;
export const refreshSession = auth.refreshSession;
export const logout = auth.logout;
export const getUser = auth.getUser;
export const getToken = auth.getToken;
export const getRefreshToken = auth.getRefreshToken;
export const isAuthenticated = auth.isAuthenticated;
