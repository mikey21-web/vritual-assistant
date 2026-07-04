import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OverviewPage from '../../pages/OverviewPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('OverviewPage', () => {
  it('renders loading skeleton initially', () => {
    const { container } = render(<OverviewPage />, { wrapper: Wrapper });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders the overview heading', () => {
    render(<OverviewPage />, { wrapper: Wrapper });
    expect(screen.getByText(/overview/i)).toBeInTheDocument();
  });
});
