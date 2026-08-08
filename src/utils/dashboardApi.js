import { API_BASE_URL, getToken, logout } from './auth';

const ENDPOINT_MAP = {
  'dashboard-alerts': '/api/alerts',
  'dashboard-bookings': '/api/bookings',
  'dashboard-calendar': '/api/calendar',
  'dashboard-clients': '/api/clients',
  'dashboard-communications': '/api/communications',
  'dashboard-files': '/api/files',
  'dashboard-finance': '/api/finance',
  'dashboard-hr': '/api/hr',
  'dashboard-login': '/api/auth/login',
  'dashboard-newsletter': '/api/newsletter',
  'dashboard-projects': '/api/projects',
  'dashboard-query': '/api/query',
  'dashboard-referrals': '/api/referrals',
  'dashboard-requests': '/api/requests',
  'dashboard-stats': '/api/stats',
  'dashboard-team': '/api/team',
  'dashboard-time-logs': '/api/time-logs',
};

export const API_ENDPOINTS = {
  alerts: '/api/alerts',
  authLogin: '/api/auth/login',
  bookings: '/api/bookings',
  calendar: '/api/calendar',
  clients: '/api/clients',
  communications: '/api/communications',
  files: '/api/files',
  finance: '/api/finance',
  hr: '/api/hr',
  newsletter: '/api/newsletter',
  projects: '/api/projects',
  query: '/api/query',
  referrals: '/api/referrals',
  requests: '/api/requests',
  stats: '/api/stats',
  team: '/api/team',
  timeLogs: '/api/time-logs',
};

export const resolveApiPath = (endpoint) => {
  if (!endpoint) return endpoint;
  if (endpoint.startsWith('/api/')) return endpoint;
  const key = endpoint.split('/').pop();
  return ENDPOINT_MAP[key] || endpoint;
};

const buildUrl = (endpoint, params) => {
  const path = resolveApiPath(endpoint);
  const url = new URL(path, API_BASE_URL);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const authHeaders = (extra = {}) => {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiFetch = async (endpoint, options = {}) => {
  const { params, headers, body, ...rest } = options;
  const hasBody = body !== undefined;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(buildUrl(endpoint, params), {
    ...rest,
    headers: authHeaders({
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      ...headers,
    }),
    ...(hasBody ? { body: isFormData || typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    logout();
    window.dispatchEvent(new CustomEvent('cw:unauthorized'));
    throw new Error('Your session has expired. Please sign in again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json;
};

export const apiGet = (endpoint, params = {}, options = {}) => apiFetch(endpoint, { ...options, method: 'GET', params });
export const apiPost = (endpoint, body = {}) => apiFetch(endpoint, { method: 'POST', body });

export const callDashboardApi = async (endpoint, action, data = {}) => {
  if (action === 'list') return apiGet(endpoint, data);
  return apiPost(endpoint, { action, data, ...data });
};

export const getList = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
