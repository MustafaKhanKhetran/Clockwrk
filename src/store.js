// Tiny reactive store over the mock data — approve/queue/rate flows update
// everywhere at once. Swap internals for real API calls later.
import { useSyncExternalStore } from 'react';
import { api } from './v3/api';
import { SERVICE_CATALOG, PLAN_CARE, PLANS, CARE_PLANS, RETAINER_EXTRA_HOURS } from './catalog';

let state = {
  // Nothing is seeded. The store starts empty and `loadFromApi()` fills it from
  // the signed-in client's real records, so a fake project or request can never
  // reach the screen. `dataSource` stays 'empty' until that resolves.
  dataSource: 'empty',
  loading: false,
  loadError: null,
  serverProjects: [],
  serverInvoices: [],
  totalPending: 0,
  account: null,
  requests: [],
  extraSlots: 0,
  paused: false,
  pauseReason: null,
  paymentStatus: 'paid',
  paymentDueAt: null,
  paymentAmount: 0,
  plan: null,
  baseSlots: 0,
  billingCadence: 'weekly',
  accountMode: 'subscription',
  retainerTier: null,
  retainerCadence: 'monthly',
  hoursUsed: 0,
  hoursResetAt: null,
  purchasedHours: 0,
  startSeq: 0,
  serviceSubscriptions: [],
  serviceOrders: [],
  pendingRequestService: null,
  subscriptionAddons: [],
  bundles: [],
  notifications: [],
};

const listeners = new Set();
const derivedCarePlan = () => PLAN_CARE[state.plan] || (state.accountMode === 'retainer' ? state.retainerTier : null);
const derivedHours = () => {
  const tier = state.accountMode === 'retainer'
    ? CARE_PLANS.find((item) => item.id === state.retainerTier)
    : null;
  const hoursIncluded = tier?.hoursIncluded ?? 0;
  const hoursAllowance = hoursIncluded + state.purchasedHours;
  const hoursRemaining = Math.max(0, hoursAllowance - state.hoursUsed);
  const hoursPct = hoursAllowance > 0 ? Math.min(1, Math.max(0, state.hoursUsed / hoursAllowance)) : 0;
  return { hoursIncluded, hoursAllowance, hoursRemaining, hoursPct };
};
const buildSnapshot = () => ({ ...state, projects: state.serverProjects, carePlan: derivedCarePlan(), ...derivedHours() });
let snapshot = buildSnapshot();
const emit = () => {
  state = { ...state };
  snapshot = buildSnapshot();
  listeners.forEach((l) => l());
};

function routeIncludedServiceToRequest(service) {
  state.pendingRequestService = service ? { category: service.category, service: service.name } : null;
  if (typeof window !== 'undefined' && window.location.pathname !== '/requests/new') {
    window.history.pushState({}, '', '/requests/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

// Invariant: the number of `active` requests can never exceed the plan's slots.
// If capacity drops below the active count (e.g. a plan downgrade or removed
// add-on), move the newest active requests back to the front of the queue.
function enforceSlotCap(s) {
  const total = s.baseSlots + s.extraSlots;
  const active = s.requests.filter((r) => r.status === 'active');
  const overflow = active.length - total;
  if (overflow <= 0) return;
  // Newest first — prefer most recently started; fall back to request order.
  const demote = [...active]
    .sort((a, b) => (b.startedOrder || 0) - (a.startedOrder || 0))
    .slice(0, overflow);
  const demoted = new Set(demote);
  demote.forEach((r) => {
    r.status = 'queued';
    r.progress = r.progress ?? 0;
    r.timeline = [
      ...(r.timeline || []).map((t) => ({ ...t, now: false })),
      { label: 'Moved to queue — plan slots reduced', at: 'Just now', done: true },
    ];
  });
  // Demoted items keep priority (front of queue), then the existing queue order.
  const existing = s.requests
    .filter((r) => r.status === 'queued' && !demoted.has(r))
    .sort((a, b) => a.queuePos - b.queuePos);
  [...demote, ...existing].forEach((r, i) => { r.queuePos = i + 1; });
}

export const store = {
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  get: () => snapshot,

  totalSlots: () => state.baseSlots + state.extraSlots,

  /** Approve a delivery. The server frees the slot and promotes the next item. */
  async approve(id) {
    const { promoted } = await api.approveRequest(id);
    state.promoted = promoted || null;
    await store.loadFromApi();
    return promoted;
  },

  /** Send the delivery back with notes. */
  async requestRevision(id, note) {
    await api.requestRevision(id, note);
    await store.loadFromApi();
  },

  /** Post a comment on a request; appended locally from the server response. */
  async addComment(id, text) {
    if (!text.trim()) return;
    const { comment } = await api.commentOnRequest(id, text.trim());
    const r = state.requests.find((x) => String(x.id) === String(id));
    if (r) r.comments = [...(r.comments || []), comment];
    emit();
  },

  rate(id, stars, feedback, published) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    r.rating = { stars, feedback, published };
    emit();
  },

  reorderQueue(from, to) {
    const queued = state.requests.filter((x) => x.status === 'queued').sort((a, b) => a.queuePos - b.queuePos);
    const [moved] = queued.splice(from, 1);
    queued.splice(to, 0, moved);
    queued.forEach((x, i) => { x.queuePos = i + 1; });
    emit();
  },

  buySlot() { state.extraSlots += 1; emit(); },
  removeSlot() { if (state.extraSlots > 0) { state.extraSlots -= 1; enforceSlotCap(state); } emit(); },
  setPaused(v, reason = 'client') {
    state.paused = v;
    state.pauseReason = v ? reason : null;
    emit();
  },
  setPaymentStatus(status) {
    state.paymentStatus = status;
    if (status === 'overdue') {
      state.paused = true;
      state.pauseReason = 'payment';
    }
    if (status === 'paid' && state.pauseReason === 'payment') {
      state.paused = false;
      state.pauseReason = null;
    }
    emit();
  },
  setPlan(name, slots) { state.plan = name; state.baseSlots = slots; enforceSlotCap(state); emit(); },
  logHours(n) {
    if (state.accountMode !== 'retainer') return;
    state.hoursUsed += Number(n) || 0;
    emit();
  },
  buyHourBlock() {
    if (state.accountMode !== 'retainer') return;
    state.purchasedHours += RETAINER_EXTRA_HOURS.block.hours;
    emit();
  },
  resetHours() {
    if (state.accountMode !== 'retainer') return;
    state.hoursUsed = 0;
    state.purchasedHours = 0;
    emit();
  },
  setBillingCadence(next) {
    state.billingCadence = next === 'monthly' ? 'monthly' : 'weekly';
    emit();
  },
  switchToRetainer(tierId, cadence = 'monthly') {
    state.accountMode = 'retainer';
    state.retainerTier = tierId;
    state.retainerCadence = cadence === 'annual' ? 'annual' : 'monthly';
    state.plan = null;
    emit();
  },
  resumeSubscription(planName) {
    const nextPlan = PLANS.find((item) => item.name === planName) || PLANS[1];
    state.accountMode = 'subscription';
    state.plan = nextPlan.name;
    state.baseSlots = nextPlan.slots;
    state.retainerTier = null;
    state.paused = false;
    state.pauseReason = null;
    enforceSlotCap(state);
    emit();
  },
  subscribeRetainer(id) {
    state.accountMode = 'retainer';
    state.retainerTier = id;
    state.plan = null;
    emit();
  },

  orderService(id, qty = 1) {
    const service = SERVICE_CATALOG.find((item) => item.id === id);
    if (!service) return;
    if (service.billing === 'included') {
      routeIncludedServiceToRequest(service);
      emit();
      return;
    }
    state.serviceOrders = [{ id: Date.now(), serviceId: id, qty, amount: service.price * qty, status: 'ordered', createdAt: 'Just now' }, ...state.serviceOrders];
    emit();
  },
  requestService(id) {
    const service = SERVICE_CATALOG.find((item) => item.id === id);
    if (service?.billing === 'included') {
      routeIncludedServiceToRequest(service);
      emit();
      return;
    }
    state.serviceOrders = [{ id: Date.now(), serviceId: id, qty: 1, amount: null, status: 'quote', createdAt: 'Just now' }, ...state.serviceOrders];
    emit();
  },
  toggleService(id, on) {
    const service = SERVICE_CATALOG.find((item) => item.id === id);
    if (service?.billing === 'included') {
      routeIncludedServiceToRequest(service);
      emit();
      return;
    }
    state.serviceSubscriptions = on
      ? [...state.serviceSubscriptions.filter((item) => item.id !== id), { id, on: true, cadence: 'mo' }]
      : state.serviceSubscriptions.filter((item) => item.id !== id);
    emit();
  },
  consumePendingRequestService() {
    const pending = state.pendingRequestService;
    state.pendingRequestService = null;
    emit();
    return pending;
  },
  registerDomain(name, tld) {
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;
    state.domains = [...state.domains, { id: Date.now(), name: `${clean}${tld}`, renewalAt: 'Jul 6, 2027', autoRenew: true, privacy: true }];
    emit();
  },
  setDomainAutoRenew(id, on) {
    state.domains = state.domains.map((domain) => domain.id === id ? { ...domain, autoRenew: on } : domain);
    emit();
  },
  toggleMonitor(id, on) {
    state.securityMonitors = state.securityMonitors.map((monitor) => monitor.id === id ? { ...monitor, on } : monitor);
    emit();
  },
  runBackup() {
    state.hosting = { ...state.hosting, backups: [{ id: Date.now(), createdAt: 'Just now', type: 'On demand', status: 'complete' }, ...state.hosting.backups] };
    emit();
  },
  buyBundle(id) {
    state.bundles = [...new Set([...state.bundles, id])];
    emit();
  },
  toggleAddon(id, cadence = 'weekly', on = true) {
    state.subscriptionAddons = on
      ? [...state.subscriptionAddons.filter((item) => item.id !== id), { id, cadence }]
      : state.subscriptionAddons.filter((item) => item.id !== id);
    emit();
  },
  markNotificationsRead() {
    state.notifications = state.notifications.map((item) => ({ ...item, unread: false }));
    emit();
  },

  // ─── Server data ───────────────────────────────────────────────────────────

  /** Load the signed-in client's real projects and requests. */
  async loadFromApi() {
    state.loading = true;
    state.loadError = null;
    emit();
    try {
      const [projectsRes, requestsRes, invoicesRes, meRes] = await Promise.all([
        api.projects(), api.requests(), api.invoices(), api.me(),
      ]);
      state.serverProjects = projectsRes.projects || [];
      state.requests = requestsRes.requests || [];
      state.serverInvoices = invoicesRes.invoices || [];
      state.totalPending = invoicesRes.total_pending || 0;
      state.account = meRes.client || null;
      // The plan drives slot capacity everywhere — take it from the account,
      // not the seed data, or an Enterprise client is shown a Business plan.
      const planName = meRes.client?.plan
        ? meRes.client.plan[0].toUpperCase() + meRes.client.plan.slice(1)
        : null;
      const planRow = PLANS.find((item) => item.name === planName);
      if (planRow) {
        state.plan = planRow.name;
        state.baseSlots = planRow.slots;
      }
      if (meRes.client?.billing) state.billingCadence = meRes.client.billing;
      // Real billing dates replace the hardcoded strings.
      if (meRes.client?.next_payment_due) state.paymentDueAt = meRes.client.next_payment_due;
      state.paymentStatus = (invoicesRes.total_pending || 0) > 0 ? 'due' : 'paid';
      state.dataSource = 'server';
      state.loadError = null;
    } catch (err) {
      // Keep whatever is on screen rather than blanking the app; surface the
      // message so the UI can say the data may be stale.
      state.loadError = err.message || 'Could not load your workspace.';
    } finally {
      state.loading = false;
      emit();
    }
  },

  /** Create a request server-side, then merge it in without a full refetch. */
  async createRequest({ projectId, title, brief, type, priority }) {
    const { request } = await api.createRequest({
      project_id: projectId,
      title,
      description: brief,
      type,
      priority,
    });
    state.requests = [request, ...state.requests];
    state.dataSource = 'server';
    emit();
    return request;
  },

  /** Create a project server-side, then refresh so it appears everywhere. */
  async createProject({ name, type, icon, description, goal, audience, successMeasure, targetDate, links, resources }) {
    const { id } = await api.createProject({
      name, type, icon, description, goal, audience,
      success_measure: successMeasure,
      target_date: targetDate || null,
      links, resources,
    });
    await store.loadFromApi();
    return id;
  },

  /** Drop server data on sign-out so the next client never sees it. */
  resetToEmpty() {
    state.requests = [];
    state.serverProjects = [];
    state.serverInvoices = [];
    state.account = null;
    state.dataSource = 'empty';
    state.loadError = null;
    emit();
  },
};

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get);
}
