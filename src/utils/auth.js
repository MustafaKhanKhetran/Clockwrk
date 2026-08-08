export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const login = async (email, password) => {
  const res  = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    const token = data.token || data.access_token || data.accessToken;
    if (!token) throw new Error('Login succeeded without an access token');
    localStorage.setItem('cw_dash_token', token);
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.setItem('cw_dash_user',  JSON.stringify(data.user));
    return data.user;
  }
  throw new Error(data.message || 'Invalid credentials');
};

export const logout = () => {
  localStorage.removeItem('cw_dash_token');
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('cw_dash_user');
};

export const getUser  = () => { try { return JSON.parse(localStorage.getItem('cw_dash_user')); } catch { return null; } };
export const getToken = () => {
  const stored = localStorage.getItem('cw_dash_token')
    || localStorage.getItem('token')
    || localStorage.getItem('access_token');
  if (!stored) return null;
  return stored.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim() || null;
};
export const isAuthenticated = () => !!getToken() && !!getUser();
