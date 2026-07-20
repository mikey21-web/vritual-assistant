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
  api: vi.fn().mockImplementation((url: string) => {
    if (url === '/mikey/status') return Promise.resolve({ outcomes: [] });
    if (url === '/mikey/outcomes') return Promise.resolve([]);
    if (url === '/mikey/temporal-insights') return Promise.resolve([]);
    if (url === '/mikey/staff') return Promise.resolve([]);
    if (url === '/mikey/actions') return Promise.resolve([]);
    if (url === '/mikey/activity') return Promise.resolve([]);
    if (url === '/mikey/memory/rules/pending?tenantId=default-tenant') return Promise.resolve([]);
    if (url === '/mikey/memory/rules/active?tenantId=default-tenant') return Promise.resolve([]);
    if (url === '/mikey/autonomous-actions') return Promise.resolve([]);
    if (url === '/mikey/autonomy-policies?tenantId=default-tenant') return Promise.resolve({});
    if (url === '/admin/ai-kill-switches') return Promise.resolve([]);
    return Promise.resolve([]);
  }),
}));

const MikeyPage = (await import('../../pages/MikeyPage')).default;

describe('MikeyPage', () => {
  it('renders loading skeleton initially', () => {
    const { container } = render(<MikeyPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders Mikey heading after data loads', async () => {
    render(<MikeyPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Mikey Command Center')).toBeInTheDocument();
    });
  });
});
