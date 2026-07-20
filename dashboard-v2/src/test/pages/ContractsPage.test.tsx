import { render, screen } from '@testing-library/react';
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
  fetchContracts: vi.fn().mockResolvedValue({ data: [] }),
  fetchQuotations: vi.fn().mockResolvedValue({ data: [] }),
  createContract: vi.fn(),
}));

const ContractsPage = (await import('../../pages/ContractsPage')).default;

describe('ContractsPage', () => {
  it('renders Contracts heading', async () => {
    render(<ContractsPage />, { wrapper: Wrapper });
    expect(await screen.findByText('Contracts')).toBeInTheDocument();
  });
});
