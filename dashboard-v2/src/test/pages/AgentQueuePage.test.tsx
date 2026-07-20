import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext, type NicheConfig } from '../../context/AppContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../lib/api';

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
  fetchTasks: vi.fn().mockResolvedValue({ data: [] }),
  fetchAgentStatus: vi.fn().mockResolvedValue({ online: true }),
  fetchAgentStats: vi.fn().mockResolvedValue({ conversationsHandled: 10, leadsQualified: 5, conversionRate: 50, appointmentsBooked: 3, avgResponseTimeSec: 30 }),
  updateTask: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../lib/api', () => ({
  api: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockResolvedValue({ success: true });
});

const AgentQueuePage = (await import('../../pages/AgentQueuePage')).default;

describe('AgentQueuePage', () => {
  it('renders queue tabs', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/leads/worklist/mine') return Promise.resolve({ leads: [], hotLeads: [], todayVisits: [] });
      return Promise.resolve({ success: true });
    });
    render(<AgentQueuePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stats').length).toBeGreaterThan(0);
  });

  it('opens WhatsApp composer modal', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/leads/worklist/mine') return Promise.resolve({
        leads: [],
        hotLeads: [{ id: 'l1', contact: { name: 'Ravi Kumar', phone: '+919876543210' }, segment: 'HOT', status: 'NEW', source: 'MANUAL', score: 85, createdAt: new Date().toISOString() }],
        todayVisits: [],
      });
      return Promise.resolve({ success: true });
    });
    render(<AgentQueuePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('My Queue')).toBeInTheDocument();
    });
    const leadsButtons = screen.getAllByText('Leads');
    fireEvent.click(leadsButtons[leadsButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    });
    const waButton = screen.getAllByTitle('WhatsApp')[0];
    fireEvent.click(waButton);
    await waitFor(() => {
      expect(screen.getByText('Send')).toBeInTheDocument();
    });
    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toBeInTheDocument();
    const sendButton = screen.getByRole('button', { name: /^send$/i });
    expect(sendButton).toBeDisabled();
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('initiates call', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/leads/worklist/mine') return Promise.resolve({
        leads: [],
        hotLeads: [{ id: 'l1', contact: { name: 'Ravi Kumar', phone: '+919876543210' }, segment: 'HOT', status: 'NEW', source: 'MANUAL', score: 85, createdAt: new Date().toISOString() }],
        todayVisits: [],
      });
      return Promise.resolve({ success: true });
    });
    render(<AgentQueuePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('My Queue')).toBeInTheDocument();
    });
    const leadsButtons = screen.getAllByText('Leads');
    fireEvent.click(leadsButtons[leadsButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    });
    const callButton = screen.getAllByTitle('Call')[0];
    fireEvent.click(callButton);
    await waitFor(() => {
      expect(vi.mocked(api)).toHaveBeenCalledWith('/telephony/call', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('l1'),
      }));
    });
  });

  it('search filters leads', async () => {
    vi.mocked(api).mockImplementation((path: string) => {
      if (path === '/leads/worklist/mine') return Promise.resolve({
        leads: [
          { id: 'l1', contact: { name: 'Ravi Kumar', phone: '+919876543210' }, segment: 'HOT', status: 'NEW', source: 'MANUAL', score: 85, createdAt: new Date().toISOString() },
          { id: 'l2', contact: { name: 'Priya Sharma', phone: '+919876543211' }, segment: 'WARM', status: 'CONTACTED', source: 'MANUAL', score: 60, createdAt: new Date().toISOString() },
        ],
        hotLeads: [],
        todayVisits: [],
      });
      return Promise.resolve({ success: true });
    });
    render(<AgentQueuePage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('My Queue')).toBeInTheDocument();
    });
    const leadsButtons = screen.getAllByText('Leads');
    fireEvent.click(leadsButtons[leadsButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search leads by name or phone...')).toBeInTheDocument();
    });
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText('Search leads by name or phone...');
    fireEvent.change(searchInput, { target: { value: 'Ravi' } });
    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    });
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
  });
});
