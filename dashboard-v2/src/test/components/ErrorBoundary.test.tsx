import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('catches errors and shows fallback UI', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders reload button', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    spy.mockRestore();
    reloadSpy.mockRestore();
  });
});
