import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext, type NicheConfig } from '../../context/AppContext';
import { vi } from 'vitest';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const mockNiche: NicheConfig = {
  industry: 'realestate',
  display_name: 'Real Estate',
  fields_to_collect: [],
  scoring_signals: [],
  conversion_goals: ['Book site visit'],
  pipeline_stages: [],
  booking_types: [],
  tone_examples: [],
  labels: { lead: 'Lead' },
  compliance: [],
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{ niche: mockNiche, loading: false, isSuperAdmin: false, isClientUser: false }}>
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

vi.mock('../../lib/api', () => ({ api: vi.fn() }));

import { api } from '../../lib/api';

const SalesTargetsPage = (await import('../../pages/SalesTargetsPage')).default;

const mockTargets = [
  { id: '1', scope: 'TENANT', metric: 'BOOKINGS', periodStart: '2024-01-01', periodEnd: '2024-03-31', targetValue: 100 },
  { id: '2', scope: 'PROJECT', metric: 'SITE_VISITS', periodStart: '2024-01-01', periodEnd: '2024-03-31', targetValue: 500 },
];

const mockProgress: Record<string, any> = {
  '1': { actualValue: 75, percentComplete: 75 },
  '2': { actualValue: 300, percentComplete: 60 },
};

describe('SalesTargetsPage', () => {
  afterEach(() => {
    vi.mocked(api).mockReset();
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('API error'));
    render(<SalesTargetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText("Couldn't load sales targets.")).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('renders Sales Targets heading after data loads', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/sales-targets') return Promise.resolve(mockTargets);
      if (path.includes('/progress')) return Promise.resolve(mockProgress[path.split('/')[2]]);
      return Promise.resolve([]);
    });
    render(<SalesTargetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Sales Targets')).toBeInTheDocument();
    });
  });

  it('displays targets with scopes, metrics, and progress percentages', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/sales-targets') return Promise.resolve(mockTargets);
      if (path.includes('/progress')) return Promise.resolve(mockProgress[path.split('/')[2]]);
      return Promise.resolve([]);
    });
    render(<SalesTargetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('TENANT')).toBeInTheDocument();
      expect(screen.getByText('BOOKINGS')).toBeInTheDocument();
      expect(screen.getByText('SITE VISITS')).toBeInTheDocument();
      expect(screen.getByText('PROJECT')).toBeInTheDocument();
    });
    const progressBars = document.querySelectorAll('[style*="width:"]');
    expect(progressBars.length).toBe(2);
  });

  it('shows New Target button', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/sales-targets') return Promise.resolve(mockTargets);
      if (path.includes('/progress')) return Promise.resolve(mockProgress[path.split('/')[2]]);
      return Promise.resolve([]);
    });
    render(<SalesTargetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('New Target')).toBeInTheDocument();
    });
  });

  it('shows empty state when no targets exist', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/sales-targets') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    render(<SalesTargetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('No sales targets set yet.')).toBeInTheDocument();
    });
  });
});
