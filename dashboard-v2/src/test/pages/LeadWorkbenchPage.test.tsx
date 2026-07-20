import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext, type NicheConfig } from '../../context/AppContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockLead = {
  id: 'lead-1',
  status: 'NEW',
  segment: 'HOT',
  source: 'MANUAL',
  score: 85,
  interest: '3BHK',
  budget: '80L',
  dealValue: 8000000,
  message: 'Looking for a 3BHK in the city center',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contact: {
    id: 'contact-1',
    name: 'Ravi Kumar',
    phone: '+919876543210',
    email: 'ravi@example.com',
    tags: [],
    createdAt: new Date().toISOString(),
  },
  assignedAgent: { id: 'agent-1', name: 'Priya Sharma', email: 'priya@example.com' },
};

const mockTimeline = [
  { id: 't1', type: 'lead_created', title: 'Lead created', description: null, leadId: 'lead-1', createdAt: new Date().toISOString(), metadata: null },
  { id: 't2', type: 'call', title: 'Call: Interested', description: 'completed', leadId: 'lead-1', createdAt: new Date().toISOString(), metadata: { recordingUrl: 'https://example.com/rec.mp3', disposition: 'INTERESTED' } },
  { id: 't3', type: 'site_visit_scheduled', title: 'Site visit scheduled for tomorrow', description: null, leadId: 'lead-1', createdAt: new Date().toISOString(), metadata: { siteVisitId: 'sv-1' } },
  { id: 't4', type: 'cost_sheet_created', title: 'Cost sheet created', description: null, leadId: 'lead-1', createdAt: new Date().toISOString(), metadata: null },
];

vi.mock('../../lib/data', () => ({
  fetchLead: vi.fn().mockResolvedValue(mockLead),
  getLeadTimeline: vi.fn().mockResolvedValue(mockTimeline),
  fetchContacts: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  holdUnit: vi.fn().mockResolvedValue({ success: true }),
  createBooking: vi.fn().mockResolvedValue({ success: true }),
  fetchLeadBookings: vi.fn().mockResolvedValue({ data: [] }),
  fetchLeadCostSheets: vi.fn().mockResolvedValue({ data: [] }),
  draftAIReply: vi.fn().mockResolvedValue({ draft: 'Draft reply text', source: 'fallback' }),
}));

vi.mock('../../lib/api', () => ({
  api: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../lib/explainMode', () => ({
  startExplainFlow: vi.fn(),
}));

beforeEach(() => {
  window.location.hash = '#/leads/lead-1';
});

const LeadWorkbenchPage = (await import('../../pages/LeadWorkbenchPage')).default;

describe('LeadWorkbenchPage', () => {
  it('renders loading skeleton initially', () => {
    const { container } = render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders lead details after loading', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    });
    expect(screen.getAllByText('NEW').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HOT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
  });

  it('renders all action buttons', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Call')).toBeInTheDocument();
    });
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Visit')).toBeInTheDocument();
    expect(screen.getByText('Cost Sheet')).toBeInTheDocument();
    expect(screen.getByText('Hold Unit')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('renders timeline entries with type-specific display', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Lead created')).toBeInTheDocument();
    });
    expect(screen.getByText('Call: Interested')).toBeInTheDocument();
    expect(screen.getByText('Site visit scheduled for tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Cost sheet created')).toBeInTheDocument();
  });

  it('shows SLA clock', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      const clock = document.querySelector('[title*="Untouched for"]');
      expect(clock).toBeTruthy();
    });
  });

  it('shows next best action for new lead with phone', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText(/not yet contacted/)).toBeInTheDocument();
    });
  });

  it('renders agent info', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
  });

  it('displays approved cost sheet quick-book banner', async () => {
    const { fetchLeadCostSheets } = await import('../../lib/data');
    vi.mocked(fetchLeadCostSheets).mockResolvedValueOnce({
      data: [{
        id: 'cs-1', status: 'APPROVED', projectId: 'proj-1', unitId: 'unit-1',
        totalPaise: '500000000', project: { name: 'Green Valley' }, unit: { unitNumber: 'A-101' },
      }],
    });
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText(/approved cost sheet/)).toBeInTheDocument();
    });
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });

  it('opens WhatsApp modal with Jarvis draft button', async () => {
    render(<LeadWorkbenchPage />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('WhatsApp')).toBeInTheDocument());
    screen.getByText('WhatsApp').click();
    await waitFor(() => {
      expect(screen.getByText('Draft with Jarvis')).toBeInTheDocument();
    });
  });
});
