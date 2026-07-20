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

vi.mock('../../lib/data', () => ({
  fetchBuilderCommand: vi.fn().mockResolvedValue({
    projects: [],
    alerts: [],
    inventory: {},
    activity: [],
    milestones: [],
    kpis: { activeLeads: 25, unassignedLeads: 3, todayVisits: 5, overduePayments: 2, missedCallsToday: 8, noShowsThisMonth: 4, bookingsThisMonth: 12, tomorrowVisits: 3 },
    recentLeads: [],
    nextActions: [],
    upcomingVisits: [],
    sourceBreakdown: [],
    topPartners: [],
    activeHolds: [],
    weakSalespeople: [],
    collectionQueue: [],
  }),
}));

const BuilderDeskPage = (await import('../../pages/BuilderDeskPage')).default;

describe('BuilderDeskPage', () => {
  it('renders loading skeleton initially', () => {
    const { container } = render(<BuilderDeskPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders builder desk heading after data loads', async () => {
    render(<BuilderDeskPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Builder Desk')).toBeInTheDocument();
    });
  });
});
