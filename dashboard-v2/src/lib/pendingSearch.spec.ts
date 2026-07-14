import { describe, it, expect, beforeEach } from 'vitest';
import { setPendingSearch, consumePendingSearch, setPendingFilter, consumePendingFilter } from './pendingSearch';

beforeEach(() => sessionStorage.clear());

describe('pendingSearch', () => {
  it('stores and consumes a search query', () => {
    setPendingSearch('leads', 'Ravi');
    expect(consumePendingSearch('leads')).toBe('Ravi');
    expect(consumePendingSearch('leads')).toBeNull();
  });

  it('stores and consumes filter with navigation payload', () => {
    setPendingFilter('leads', { filters: { status: 'HOT' }, highlightId: 'lead-123', summary: '12 hot leads' });
    const f = consumePendingFilter('leads');
    expect(f).toBeDefined();
    expect(f!.filters!.status).toBe('HOT');
    expect(f!.highlightId).toBe('lead-123');
    expect(f!.summary).toBe('12 hot leads');
    expect(consumePendingFilter('leads')).toBeNull();
  });
});
