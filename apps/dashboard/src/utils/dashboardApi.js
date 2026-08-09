import { Alert, Client, Plan, Request } from '@clockwrk/shared-types';
import { API_BASE_URL, getToken, logout, refreshSession } from './auth';

export const sharedSchemas = Object.freeze({ Alert, Client, Plan, Request });

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

const doFetch = (endpoint, options) => {
  const { params, headers, body, ...rest } = options;
  const hasBody = body !== undefined;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return fetch(buildUrl(endpoint, params), {
    ...rest,
    headers: authHeaders({
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      ...headers,
    }),
    ...(hasBody ? { body: isFormData || typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
};

export const apiFetch = async (endpoint, options = {}) => {
  let res = await doFetch(endpoint, options);
  // On expired access token, try one silent refresh before giving up.
  // Concurrent 401s share a single /refresh promise (see refreshSession).
  if (res.status === 401) {
    const newToken = await refreshSession();
    if (newToken) {
      res = await doFetch(endpoint, options);
    }
    if (res.status === 401) {
      await logout();
      window.dispatchEvent(new CustomEvent('cw:unauthorized'));
      throw new Error('Your session has expired. Please sign in again.');
    }
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json;
};

export const apiGet = (endpoint, params = {}, options = {}) => apiFetch(endpoint, { ...options, method: 'GET', params });
export const apiPost = (endpoint, body = {}) => apiFetch(endpoint, { method: 'POST', body });
export const apiPatch = (endpoint, body = {}) => apiFetch(endpoint, { method: 'PATCH', body });
export const apiPut = (endpoint, body = {}) => apiFetch(endpoint, { method: 'PUT', body });
export const apiDelete = (endpoint, params = {}) => apiFetch(endpoint, { method: 'DELETE', params });

const compact = value => Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== undefined));

const canonicalPayload = (path, value) => {
  const body = { ...(value || {}) };
  delete body.action; delete body.data;
  if (path === API_ENDPOINTS.projects) {
    Object.assign(body, {
      name: body.name ?? body.project_name,
      client_id: body.client_id ?? (Number(body.client) || undefined),
      type: body.type ?? body.project_type,
      project_manager_id: body.project_manager_id ?? (Number(body.assigned_project_manager) || undefined),
      staging_url: body.staging_url ?? body.staging_link,
      live_url: body.live_url ?? body.live_link,
      progress_percent: body.progress_percent ?? body.progress,
      notes: body.notes ?? body.brief,
    });
  }
  if (path === API_ENDPOINTS.requests) {
    Object.assign(body, {
      client_id: body.client_id ?? (Number(body.client) || undefined),
      project_id: body.project_id ?? (Number(body.project) || undefined),
      description: body.description ?? body.request_brief,
    });
  }
  if (path === API_ENDPOINTS.team) body.notes = body.notes ?? body.performance_notes;
  return compact(body);
};

export const callDashboardApi = async (endpoint, action, data = {}) => {
  const path = resolveApiPath(endpoint);
  if (action === 'list') return apiGet(path, data);
  const body = canonicalPayload(path, data);
  const identityKey = path === API_ENDPOINTS.requests ? 'request_id'
    : path === API_ENDPOINTS.projects ? 'project_id'
      : path === API_ENDPOINTS.clients ? 'client_id'
        : path === API_ENDPOINTS.team ? 'employee_id'
          : path === API_ENDPOINTS.timeLogs ? 'time_log_id'
            : path === API_ENDPOINTS.bookings ? 'booking_id' : 'id';
  const id = body[identityKey];
  delete body[identityKey];
  if (action === 'create' || action === 'add') return apiPost(path, body);
  if (action === 'update') return apiPatch(`${path}/${id}`, body);
  if (action === 'update_status') return apiPatch(`${path}/${id}`, { status: body.status });
  if (action === 'deactivate') return apiPatch(`${path}/${id}`, { status: 'inactive' });
  if (action === 'delete') return apiDelete(`${path}/${id}`);
  if (action === 'add_comment' && path === API_ENDPOINTS.requests) {
    return apiPost(`${path}/${id}/comments`, { comment: body.content || body.comment, visibility: body.visibility || 'internal' });
  }
  if (action === 'log_time' && path === API_ENDPOINTS.requests) {
    return apiPost(API_ENDPOINTS.timeLogs, { request_id: id, hours: body.hours, description: body.description || '' });
  }
  throw new Error(`Unsupported dashboard action: ${action}`);
};

export const getList = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
