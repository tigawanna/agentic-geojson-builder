import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query client.
 *
 * Defaults tuned for an Electron app:
 *   - `retry: 1` — we're usually hitting reliable HTTP APIs; too many retries waste time
 *   - `staleTime: 30s` — avoid refetching on every re-render
 *   - `refetchOnWindowFocus: false` — less surprising UX on desktop (windows refocus often)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
