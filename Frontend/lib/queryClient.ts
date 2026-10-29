import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (keep offline cache active)
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // Prevent aggressive re-fetching on mobile app resume
    },
    mutations: {
      retry: 1,
    },
  },
});

