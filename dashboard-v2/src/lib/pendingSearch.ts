const PREFIX = 'pendingSearch:';

export function setPendingSearch(scope: 'leads' | 'contacts', value: string) {
  sessionStorage.setItem(PREFIX + scope, value);
}

export function consumePendingSearch(scope: 'leads' | 'contacts'): string | null {
  const key = PREFIX + scope;
  const value = sessionStorage.getItem(key);
  if (value !== null) sessionStorage.removeItem(key);
  return value;
}
