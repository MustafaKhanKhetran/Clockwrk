// Tiny reactive store over the mock data — approve/queue/rate flows update
// everywhere at once. Swap internals for real API calls later.
import { useSyncExternalStore } from 'react';
import { requestsSeed, me } from './mocks';

let state = {
  requests: JSON.parse(JSON.stringify(requestsSeed)),
  extraSlots: me.extraSlots,
  paused: me.paused,
  plan: me.plan,
  baseSlots: me.slots,
};

const listeners = new Set();
const emit = () => { state = { ...state }; listeners.forEach((l) => l()); };

export const store = {
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  get: () => state,

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
    r.status = 'active';
    r.progress = 80;
    r.revisionsUsed = (r.revisionsUsed || 0) + 1;
    r.timeline = [...(r.timeline || []).map((t) => ({ ...t, now: false })), { label: `Revision requested${note ? ` — "${note.slice(0, 60)}"` : ''}`, at: 'Just now', done: true, kind: 'revision' }, { label: 'Revising', at: 'now', now: true }];
    if (note) r.comments = [...r.comments, { who: 'You', at: 'Just now', text: note }];
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
  removeSlot() { if (state.extraSlots > 0) state.extraSlots -= 1; emit(); },
  setPaused(v) { state.paused = v; emit(); },
  setPlan(name, slots) { state.plan = name; state.baseSlots = slots; emit(); },
};

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get);
}
