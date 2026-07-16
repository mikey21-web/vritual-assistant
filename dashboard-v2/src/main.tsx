import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-js/react';
import App from './App.tsx';
import './index.css';
import { initPostHog } from './lib/posthog';
import posthog from './lib/posthog';

initPostHog();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    </QueryClientProvider>
  </StrictMode>,
);
