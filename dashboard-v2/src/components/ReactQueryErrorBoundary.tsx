import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasQueryError: boolean;
}

/**
 * Error boundary specifically for React Query async errors.
 * Wraps the QueryClientProvider to catch rendering failures from query results.
 */
export class ReactQueryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasQueryError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasQueryError: true };
  }

  handleRetry = () => {
    this.setState({ hasQueryError: false });
  };

  render() {
    if (this.state.hasQueryError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-4xl mb-4">!</div>
          <h3 className="text-lg font-semibold mb-2">Something went wrong loading data</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">There was a problem fetching data. Please try again.</p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
