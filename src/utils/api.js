const BASE = 'https://api.clockwrk.io';

export const getToken = () => localStorage.getItem('portal_token');
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('portal_user') || 'null');
  } catch {
    return null;
  }
};

export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const apiGet = (path) => apiFetch(path);
export const apiPost = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiUrl = (path) => BASE + path;

export function arrayFrom(data, ...keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const objectFrom = (data, key) => data?.[key] || data?.data?.[key] || data?.data || data || {};
