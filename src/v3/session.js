// Reactive wrapper around the stored auth session.
//
// The route guard has to re-render when the session changes — signing in, signing
// out, or a 401 clearing the token from inside api.js. Reading localStorage
// directly in the guard (what the demo build did) meant React never knew.

import { useSyncExternalStore } from 'react';
import { clearSession, getStoredClient, getToken, setSession, setSessionClearedHandler } from './api';

const listeners = new Set();
let snapshot = buildSnapshot();

function buildSnapshot() {
  const token = getToken();
  return { authed: !!token, client: token ? getStoredClient() : null };
}

function emit() {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

// A 401 inside api.js clears the token outside of React — re-read on that.
setSessionClearedHandler(emit);

// Signing out in one tab should sign out the others too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key.startsWith('clockwrk_portal_')) emit();
  });
}

export const session = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => snapshot,
  signIn(token, client) {
    setSession(token, client);
    emit();
  },
  signOut() {
    clearSession();
    emit();
  },
  /** Call after anything outside React mutates the session (e.g. a 401). */
  refresh: emit,
};

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.get);
}
