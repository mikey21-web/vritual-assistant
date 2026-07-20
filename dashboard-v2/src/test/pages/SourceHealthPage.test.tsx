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
    { provider: 'indiamart', status: 'ACTIVE', leadCount: 45, lastEventAt: new Date().toISOString(), last7DaysCount: 30, createdCount7d: 25, duplicateCount7d: 5, failedCount7d: 0 },
  ]),
}));

const SourceHealthPage = (await import('../../pages/SourceHealthPage')).default;

describe('SourceHealthPage', () => {
  it('shows loading text initially', () => {
    render(<SourceHealthPage />, { wrapper: Wrapper });
    expect(screen.getByText('Loading connector health...')).toBeInTheDocument();
  });

  it('renders IndiaMART row after data loads', async () => {
    render(<SourceHealthPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('IndiaMART')).toBeInTheDocument();
    });
  });
});
