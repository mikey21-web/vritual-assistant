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
  fetchQuotations: vi.fn().mockResolvedValue({ data: [] }),
  fetchContacts: vi.fn().mockResolvedValue({ data: [] }),
  createQuotation: vi.fn(),
}));

const QuotationsPage = (await import('../../pages/QuotationsPage')).default;

describe('QuotationsPage', () => {
  it('renders Quotations heading', async () => {
    render(<QuotationsPage />, { wrapper: Wrapper });
    expect(await screen.findByText('Quotations')).toBeInTheDocument();
  });
});
