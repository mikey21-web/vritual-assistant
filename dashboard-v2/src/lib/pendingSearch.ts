const PREFIX = 'pendingSearch:';
const FILTER_PREFIX = 'pendingFilter:';

export function setPendingSearch(scope: 'leads' | 'contacts', value: string) {
  sessionStorage.setItem(PREFIX + scope, value);
}

export function consumePendingSearch(scope: 'leads' | 'contacts'): string | null {
  const key = PREFIX + scope;
  const value = sessionStorage.getItem(key);
  if (value !== null) sessionStorage.removeItem(key);
  return value;
}

export interface PendingFilter {
  filters?: Record<string, string>;
  highlightId?: string;
}

export const PENDING_FILTER_APPLIED_EVENT = 'pendingFilter:applied';

export function setPendingFilter(scope: string, payload: PendingFilter) {
  sessionStorage.setItem(FILTER_PREFIX + scope, JSON.stringify(payload));
  // Consecutive explain-flow steps can target the same page, which never triggers a
  // hash change (and so never remounts the page's mount-only consume effect) — this
  // event lets an already-mounted page re-check for a new pending filter.
  window.dispatchEvent(new CustomEvent<string>(PENDING_FILTER_APPLIED_EVENT, { detail: scope }));
}

export function consumePendingFilter(scope: string): PendingFilter | null {
  const key = FILTER_PREFIX + scope;
  const value = sessionStorage.getItem(key);
  if (value === null) return null;
  sessionStorage.removeItem(key);
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
