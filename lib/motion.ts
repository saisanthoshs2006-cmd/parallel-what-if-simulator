/**
 * Single source of truth for the user's reduced-motion preference.
 *
 * `prefersReducedMotion()` is a cheap cached read, safe to call every frame from
 * `useFrame` loops. The cache follows live changes to the OS/browser setting.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

let mql: MediaQueryList | null = null;
let current = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (mql || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  mql = window.matchMedia(QUERY);
  current = mql.matches;
  mql.addEventListener?.("change", (e) => {
    current = e.matches;
    listeners.forEach((l) => l());
  });
}

export function prefersReducedMotion(): boolean {
  ensureInit();
  return current;
}

export function subscribeReducedMotion(cb: () => void): () => void {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Test helper: drop the cached media query so the next read re-evaluates it. */
export function __resetReducedMotionForTests() {
  mql = null;
  current = false;
  listeners.clear();
}
