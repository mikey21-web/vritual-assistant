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
    { id: '1', projectName: 'Test', status: 'DRAFT', totalPaise: '10000000', lead: { contact: { name: 'Buyer' } }, unit: { unitNumber: 'A1' }, createdAt: new Date().toISOString() },
  ]),
}));

const CostSheetsPage = (await import('../../pages/CostSheetsPage')).default;

describe('CostSheetsPage', () => {
  it('shows loading text initially', () => {
    render(<CostSheetsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Loading cost sheets...')).toBeInTheDocument();
  });

  it('renders Cost Sheets heading after data loads', async () => {
    render(<CostSheetsPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Cost Sheets')).toBeInTheDocument();
    });
  });
});
