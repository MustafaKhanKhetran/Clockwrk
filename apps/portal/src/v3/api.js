import { AuthError, createAuthClient } from '@clockwrk/auth';
import { Alert, Client, Plan, Request } from '@clockwrk/shared-types';

export const sharedSchemas = Object.freeze({ Alert, Client, Plan, Request });

// Thin client for the Clockwrk client-portal API (`/api/client/*` in clockwrk-api).
//
// Everything the portal sends goes through `request()` so token handling, JSON
// parsing and error shape are consistent in one place. A 401 means the token is
// gone or expired — we clear the session and let the route guard bounce to
// /login rather than letting pages render half-broken.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'clockwrk_portal_token';
const CLIENT_KEY = 'clockwrk_portal_client';
const portalAuth = createAuthClient({
  apiBase: `${BASE}/api/client`,
  tokenKey: TOKEN_KEY,
  userKey: CLIENT_KEY,
  persistLogin: false,
  endpoints: { challenge: null, refresh: null, logout: null },
});

export function getToken() {
  return portalAuth.getToken();
}

export function getStoredClient() {
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, client) {
  portalAuth.setSession(token, client);
}

export function clearSession() {
  portalAuth.clearSession();
}

// session.js registers here so a 401 clearing the token still re-renders the
// route guard. Kept as a callback rather than importing session.js, which would
// be a circular import.
let onSessionCleared = () => {};
export function setSessionClearedHandler(fn) {
  onSessionCleared = fn;
}

export function isAuthed() {
  return !!getToken();
}

/** Thrown for any non-2xx response, carrying the server's message and status. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}/api/client${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Network-level failure (offline, DNS, CORS refusal) — fetch rejects with a
    // useless "Failed to fetch", so give the UI something a person can act on.
    throw new ApiError('Cannot reach Clockwrk right now. Check your connection.', 0);
  }

  // 204s and error pages have no JSON body; treat an unparseable body as empty.
  const data = await res.json().catch(() => null);

  if (res.status === 401 && auth) {
    clearSession();
    onSessionCleared();
    throw new ApiError(data?.message || 'Your session expired. Please sign in again.', 401);
  }
  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

/** Uploads bypass `request()` because the body is multipart, not JSON. */
export async function uploadFile(file) {
  const body = new FormData();
  body.append('file', file);
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}/api/client/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw new ApiError('Upload failed — check your connection.', 0);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401) { clearSession(); onSessionCleared(); throw new ApiError('Session expired.', 401); }
  if (!res.ok) throw new ApiError(data?.message || 'Upload failed.', res.status);
  return data;
}

export async function uploadSetupAvatar(token, file) {
  const body = new FormData();
  body.append('token', token);
  body.append('file', file);
  let res;
  try {
    res = await fetch(`${BASE}/api/client/setup/avatar`, { method: 'POST', body });
  } catch {
    throw new ApiError('Profile picture upload failed — check your connection.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || 'Profile picture upload failed.', res.status);
  return data;
}

export const api = {
  login: async (email, password) => {
    try {
      return await portalAuth.login(email, password);
    } catch (error) {
      if (error instanceof AuthError) throw new ApiError(error.message, error.status);
      throw error;
    }
  },
  forgotPassword: (email) => request('/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, new_password) => request('/reset-password', { method: 'POST', body: { token, new_password }, auth: false }),
  setupDetails: (token) => request(`/setup?token=${encodeURIComponent(token)}`, { auth: false }),
  completeSetup: (payload) => request('/setup', { method: 'POST', body: payload, auth: false }),
  me: () => request('/me'),
  saveOnboarding: (version) => request('/onboarding', { method: 'PUT', body: { version } }),
  updateMe: (patch) => request('/me', { method: 'PATCH', body: patch }),
  changePassword: (current_password, new_password) =>
    request('/change-password', { method: 'POST', body: { current_password, new_password } }),

  dashboard: () => request('/dashboard'),

  // Billing changes — nothing activates until the team verifies the transfer.
  paymentDetails: () => request('/billing/payment-details'),
  billingSummary: () => request('/billing/summary'),
  billingQuote: (kind, target, quantity = 1, cadence) => {
    const query = new URLSearchParams({ kind, target, quantity: String(quantity) });
    if (cadence) query.set('cadence', cadence);
    return request(`/billing/quote?${query}`);
  },
  requestBillingChange: (payload) => request('/billing/changes', { method: 'POST', body: payload }),
  reportTransfer: (id) => request(`/billing/changes/${id}/reported`, { method: 'POST' }),
  cancelBillingChange: (id) => request(`/billing/changes/${id}/cancel`, { method: 'POST' }),
  saveNotifications: (prefs) => request('/notifications', { method: 'PUT', body: prefs }),
  contacts: () => request('/contacts'),
  addContact: (contact) => request('/contacts', { method: 'POST', body: contact }),
  updateContact: (id, patch) => request(`/contacts/${id}`, { method: 'PATCH', body: patch }),
  removeContact: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  projects: () => request('/projects'),
  invoices: () => request('/invoices'),
  files: () => request('/files'),

  requests: () => request('/requests'),
  createRequest: (payload) => request('/requests', { method: 'POST', body: payload }),
  reorderQueue: (orderedIds) => request('/requests/queue', { method: 'PUT', body: { ordered_ids: orderedIds } }),
  requestBreakdown: (id) => request(`/requests/${id}/breakdown`),
  approveBreakdown: (id) => request(`/requests/${id}/breakdown/approve`, { method: 'POST' }),
  approveRequest: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
  requestRevision: (id, note) => request(`/requests/${id}/revision`, { method: 'POST', body: { note } }),
  commentOnRequest: (id, text) => request(`/requests/${id}/comments`, { method: 'POST', body: { text } }),
  createProject: (payload) => request('/projects', { method: 'POST', body: payload }),
  project: (id) => request(`/projects/${id}`),
  updateProject: (id, patch) => request(`/projects/${id}`, { method: 'PATCH', body: patch }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  addProjectLink: (id, link) => request(`/projects/${id}/links`, { method: 'POST', body: link }),
  removeProjectLink: (id, linkId) => request(`/projects/${id}/links/${linkId}`, { method: 'DELETE' }),
  addProjectResource: (id, resource) => request(`/projects/${id}/resources`, { method: 'POST', body: resource }),
  removeProjectResource: (id, resourceId) => request(`/projects/${id}/resources/${resourceId}`, { method: 'DELETE' }),

  messages: (projectId) => request(projectId ? `/messages?project_id=${projectId}` : '/messages'),
  sendMessage: (content, projectId, attachments) => request('/messages', { method: 'POST', body: { content, project_id: projectId, attachments } }),

  availability: (days = 8) => request(`/bookings/availability?days=${days}`),
  bookings: () => request('/bookings'),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),

  tickets: () => request('/tickets'),
  ticket: (id) => request(`/tickets/${id}`),
  createTicket: (payload) => request('/tickets', { method: 'POST', body: payload }),
  replyToTicket: (id, message) => request(`/tickets/${id}/reply`, { method: 'POST', body: { message } }),
};
