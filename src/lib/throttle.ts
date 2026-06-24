import "server-only";

// Lightweight in-memory login throttle for the credential paths that are NOT
// backed by the DB lockout columns (staff guard/admin and the env-based
// superadmin). Residents already have durable lockout in the residents table.
//
// Caveat: this state lives per server instance, so under heavy horizontal
// scaling it is best-effort, not a guarantee. It still defeats the common case
// — a single attacker hammering one endpoint. For strong guarantees, move to a
// shared store (e.g. Upstash Redis) or add lockout columns to staff_users.

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { failed: number; first: number; lockedUntil: number };

const globalForThrottle = globalThis as unknown as {
  loginThrottle?: Map<string, Entry>;
};
const store = (globalForThrottle.loginThrottle ??= new Map<string, Entry>());

export function isLocked(key: string): boolean {
  const e = store.get(key);
  if (!e) return false;
  if (e.lockedUntil > Date.now()) return true;
  // Lock expired — reset so the user gets a fresh window.
  if (e.lockedUntil && e.lockedUntil <= Date.now()) store.delete(key);
  return false;
}

// Record a failed attempt; returns true if the key is now locked.
export function recordFailure(key: string): boolean {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.first > WINDOW_MS) {
    store.set(key, { failed: 1, first: now, lockedUntil: 0 });
    return false;
  }
  e.failed += 1;
  if (e.failed >= MAX_FAILED) {
    e.lockedUntil = now + LOCK_MS;
    return true;
  }
  return false;
}

export function recordSuccess(key: string): void {
  store.delete(key);
}
