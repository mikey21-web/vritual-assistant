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
  api: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/data', () => ({
  fetchLead: vi.fn().mockResolvedValue({
    id: 'lead-1',
    contact: { name: 'John Doe', phone: '+919876543210', email: 'john@test.com' },
    status: 'NEW',
    segment: 'HOT',
    source: 'indiamart',
    score: 85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  getLeadTimeline: vi.fn().mockResolvedValue([]),
  fetchContacts: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  holdUnit: vi.fn(),
  createBooking: vi.fn(),
  fetchLeadBookings: vi.fn().mockResolvedValue([]),
}));

window.location.hash = '#/leads/lead-1';

const LeadWorkbenchPage = (await import('../../pages/LeadWorkbenchPage')).default;

describe('LeadWorkbenchPage', () => {
  it('renders loading skeleton initially', () => {
    window.location.hash = '#/leads/lead-1';
    const { container } = render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders lead name after data loads', async () => {
    window.location.hash = '#/leads/lead-1';
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
