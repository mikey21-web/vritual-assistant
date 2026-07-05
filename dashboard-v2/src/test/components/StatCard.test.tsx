import { render, screen } from '@testing-library/react';
import { StatCard } from '../../components/StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Leads" value="100" />);
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders with minimal props', () => {
    render(<StatCard title="Test" value="0" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('shows trend up indicator', () => {
    render(<StatCard title="Leads" value="50" change="15%" changeDirection="up" />);
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('shows trend down indicator', () => {
    render(<StatCard title="Leads" value="50" change="8%" changeDirection="down" />);
    expect(screen.getByText(/8%/)).toBeInTheDocument();
  });

  it('shows timeframe text when provided', () => {
    render(<StatCard title="Leads" value="50" change="▲" timeframe="vs last month" />);
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<StatCard title="Leads" value="50" loading />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
