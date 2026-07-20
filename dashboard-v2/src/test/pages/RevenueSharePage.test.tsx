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

const RevenueSharePage = (await import('../../pages/RevenueSharePage')).default;

const mockAgreements = [
  { id: '1', partnerName: 'ABC Corp', project: { name: 'Project X' }, partnerType: 'LANDOWNER', sharePercent: 25, estimatedTotalSharePaise: 500000000, paidToDatePaise: 100000000, status: 'ACTIVE' },
  { id: '2', partnerName: 'XYZ Ltd', project: { name: 'Project Y' }, partnerType: 'CO_PROMOTER', sharePercent: 15, estimatedTotalSharePaise: 300000000, paidToDatePaise: 0, status: 'SETTLED' },
];

describe('RevenueSharePage', () => {
  beforeEach(() => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path.includes('/revenue-share/agreements')) return Promise.resolve(mockAgreements);
      if (path.includes('/projects')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('renders Revenue Share Allocation heading after data loads', async () => {
    render(<RevenueSharePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Revenue Share Allocation')).toBeInTheDocument();
    });
  });

  it('shows subtitle describing purpose', async () => {
    render(<RevenueSharePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Landowner & co-promoter settlements')).toBeInTheDocument();
    });
  });

  it('loads and displays agreements with partner names and projects', async () => {
    render(<RevenueSharePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('ABC Corp')).toBeInTheDocument();
      expect(screen.getByText('XYZ Ltd')).toBeInTheDocument();
      expect(screen.getByText('Project X · LANDOWNER')).toBeInTheDocument();
      expect(screen.getByText('Project Y · CO_PROMOTER')).toBeInTheDocument();
    });
  });

  it('shows New Agreement button', async () => {
    render(<RevenueSharePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('New Agreement')).toBeInTheDocument();
    });
  });

  it('shows ACTIVE and SETTLED badges on agreements', async () => {
    render(<RevenueSharePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('SETTLED')).toBeInTheDocument();
    });
  });
});
