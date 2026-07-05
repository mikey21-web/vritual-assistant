import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext, type NicheConfig } from '../../context/AppContext';
import { vi } from 'vitest';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const mockNiche: NicheConfig = {
  industry: 'healthcare',
  display_name: 'Health Clinic',
  fields_to_collect: [],
  scoring_signals: [],
  conversion_goals: ['Book consultation'],
  pipeline_stages: [],
  booking_types: [],
  tone_examples: [],
  labels: { lead: 'Patient' },
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

vi.mock('../../lib/data', () => ({
  fetchAnalytics: vi.fn().mockResolvedValue({
    total: 100, hot: 20, converted: 10, conversionRate: 10,
  }),
  fetchHealth: vi.fn().mockResolvedValue({
    status: 'ok', checks: { database: 'connected' },
  }),
  fetchFailures: vi.fn().mockResolvedValue([]),
}));

// Dynamic import after mock
const OverviewPage = (await import('../../pages/OverviewPage')).default;

describe('OverviewPage', () => {
  it('renders loading skeleton initially when no data', () => {
    const { container } = render(<OverviewPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders dashboard heading after data loads', async () => {
    render(<OverviewPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Health Clinic Overview')).toBeInTheDocument();
    });
  });
});
