/**
 * Timezone-aware date formatting utilities.
 * All API timestamps are stored as UTC; this module converts to the user's
 * configured timezone (stored in localStorage or business settings).
 */

const DEFAULT_TZ = typeof Intl !== 'undefined'
  ? Intl.DateTimeFormat().resolvedOptions().timeZone
  : 'UTC';

export function getUserTimezone(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_TZ;
  return localStorage.getItem('user-timezone') || DEFAULT_TZ;
}

export function setUserTimezone(tz: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('user-timezone', tz);
}

export function formatDate(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: getUserTimezone(),
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date);
}

export function formatDateOnly(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: getUserTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatTimeOnly(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: getUserTimezone(),
    timeStyle: 'short',
  }).format(date);
}

export function formatRelative(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(diffDay, 'day');
}
