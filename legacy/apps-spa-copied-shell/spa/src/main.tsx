import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { queryKeyPrefixes } from "./data-access-layer/query-keys";
import { RouterErrorComponent } from "./lib/tanstack/router/routerErrorComponent";
import { RouterNotFoundComponent } from "./lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "./lib/tanstack/router/RouterPendingComponent";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
// Set up a QueryClient instance

type QueryKey = [(typeof queryKeyPrefixes)[keyof typeof queryKeyPrefixes], ...(readonly unknown[])];

interface MyMeta extends Record<string, unknown> {
  invalidates?: [QueryKey[0], ...(readonly unknown[])][];
  [key: string]: unknown;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryKey: QueryKey;
    mutationKey: QueryKey;
    queryMeta: MyMeta;
    mutationMeta: MyMeta;
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async (_, __, ___, mutation) => {
      if (Array.isArray(mutation.meta?.invalidates)) {
        // biome-ignore lint/complexity/noForEach: <explanation>
        mutation.meta?.invalidates.forEach((queryKey) => {
          return queryClient.invalidateQueries({
            queryKey,
          });
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});
// Set up a Router instance
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultViewTransition: true,
  defaultPendingComponent: () => <RouterPendingComponent />,
  defaultNotFoundComponent: () => <RouterNotFoundComponent />,
  defaultErrorComponent: ({ error }) => <RouterErrorComponent error={error} />,
  context: {
    queryClient,
    viewer: undefined,
  },
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
