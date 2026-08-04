// Tiny reactive store over the mock data — approve/queue/rate flows update
// everywhere at once. Swap internals for real API calls later.
import { useSyncExternalStore } from 'react';
import {
  requestsSeed, me, SERVICE_CATALOG, PLAN_CARE, PLANS, CARE_PLANS, RETAINER_EXTRA_HOURS, domainsSeed,
  mailboxesSeed, hostingSeed, securitySeed, reportsSeed,
} from './mocks';

let state = {
  requests: JSON.parse(JSON.stringify(requestsSeed)),
  extraSlots: me.extraSlots,
  paused: me.paused,
  plan: me.plan,
  baseSlots: me.slots,
  billingCadence: 'weekly',
  accountMode: 'subscription',
  retainerTier: null,
  retainerCadence: 'monthly',
  hoursUsed: 1.5,
  hoursResetAt: 'Aug 18',
  purchasedHours: 0,
  startSeq: 0,
  serviceSubscriptions: [],
  serviceOrders: [],
  pendingRequestService: null,
  domains: JSON.parse(JSON.stringify(domainsSeed)),
  mailboxes: JSON.parse(JSON.stringify(mailboxesSeed)),
  hosting: JSON.parse(JSON.stringify(hostingSeed)),
  securityMonitors: JSON.parse(JSON.stringify(securitySeed)),
  reports: JSON.parse(JSON.stringify(reportsSeed)),
  subscriptionAddons: [],
  bundles: [],
  notifications: [
    { id: 1, text: 'Three deliveries are ready for review', unread: true },
    { id: 2, text: 'Website health report generated', unread: true },
  ],
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
let snapshot = { ...state, carePlan: derivedCarePlan(), ...derivedHours() };
const emit = () => {
  state = { ...state };
  snapshot = { ...state, carePlan: derivedCarePlan(), ...derivedHours() };
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

  approve(id) {
    const reqs = state.requests;
    const r = reqs.find((x) => x.id === id);
    if (!r) return;
    r.status = 'done';
    r.approvedAt = 'Just now';
    r.timeline = [...(r.timeline || []).map((t) => ({ ...t, now: false, done: true })), { label: 'Approved by you', at: 'Just now', done: true }];
    // promote first queued request into the freed slot
    const queued = reqs.filter((x) => x.status === 'queued').sort((a, b) => a.queuePos - b.queuePos);
    if (queued[0] && !state.paused) {
      const nxt = queued[0];
      nxt.status = 'active';
      nxt.progress = 0;
      nxt.startedOrder = ++state.startSeq;
      nxt.startedAt = 'Just now';
      nxt.due = 'in 2–3 days';
      nxt.timeline = [
        { label: 'Submitted', at: nxt.submittedAt || '—', done: true },
        { label: 'Started — slot freed by your approval', at: 'Just now', done: true },
        { label: 'In progress', at: 'now', now: true },
      ];
      reqs.filter((x) => x.status === 'queued').forEach((x, i) => { x.queuePos = i + 1; });
      state.promoted = nxt.title;
    } else {
      state.promoted = null;
    }
    emit();
  },

  requestRevision(id, note) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    const total = state.baseSlots + state.extraSlots;
    const activeCount = state.requests.filter((x) => x.status === 'active' && x.id !== id).length;
    const slotFree = activeCount < total;
    r.revisionsUsed = (r.revisionsUsed || 0) + 1;
    r.comments = note ? [...(r.comments || []), { who: 'You', at: 'Just now', text: note }] : r.comments;
    const revisionEntry = { label: `Revision requested${note ? ` — "${note.slice(0, 60)}"` : ''}`, at: 'Just now', done: true, kind: 'revision' };
    if (slotFree) {
      r.status = 'active';
      r.progress = 80;
      r.startedOrder = ++state.startSeq;
      r.timeline = [...(r.timeline || []).map((t) => ({ ...t, now: false })), revisionEntry, { label: 'Revising', at: 'now', now: true }];
    } else {
      // All slots busy — the revision waits at the front of the queue so we
      // never exceed the plan's active-request limit.
      r.status = 'queued';
      const existing = state.requests
        .filter((x) => x.status === 'queued' && x.id !== id)
        .sort((a, b) => a.queuePos - b.queuePos);
      r.queuePos = 1;
      existing.forEach((x, i) => { x.queuePos = i + 2; });
      r.timeline = [...(r.timeline || []).map((t) => ({ ...t, now: false })), revisionEntry, { label: 'Queued for revision — starts when a slot frees', at: 'Just now', done: true }];
    }
    emit();
  },

  addComment(id, text) {
    const r = state.requests.find((x) => x.id === id);
    if (!r || !text.trim()) return;
    r.comments = [...r.comments, { who: 'You', at: 'Just now', text: text.trim() }];
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
  setPaused(v) { state.paused = v; emit(); },
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
    const nextPlan = PLANS.find((item) => item.name === planName) || PLANS.find((item) => item.name === me.plan) || PLANS[1];
    state.accountMode = 'subscription';
    state.plan = nextPlan.name;
    state.baseSlots = nextPlan.slots;
    state.retainerTier = null;
    state.paused = false;
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
};

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get);
}
