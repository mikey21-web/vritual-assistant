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

vi.mock('../../lib/api', () => ({
  api: vi.fn().mockResolvedValue([
    { id: '1', lead: { contact: { name: 'John' } }, startAt: new Date().toISOString(), status: 'SCHEDULED', project: { name: 'Test Project' }, assignedAgent: { name: 'Agent A' } },
  ]),
}));

const SiteVisitsPage = (await import('../../pages/SiteVisitsPage')).default;

describe('SiteVisitsPage', () => {
  it('shows loading text initially', () => {
    render(<SiteVisitsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Loading site visits...')).toBeInTheDocument();
  });

  it('renders Site Visits heading after data loads', async () => {
    render(<SiteVisitsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Site Visits')).toBeInTheDocument();
    });
  });
});
