import { createHashHistory, createRouter } from "@tanstack/react-router";
import { RouterErrorComponent } from "@renderer/lib/tanstack/router/RouterErrorComponent";
import { RouterNotFoundComponent } from "@renderer/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@renderer/lib/tanstack/router/RouterPendingComponent";
import { routeTree } from "@renderer/routeTree.gen";

const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: "intent",
  defaultViewTransition: true,
  defaultPendingComponent: () => <RouterPendingComponent />,
  defaultNotFoundComponent: () => <RouterNotFoundComponent />,
  defaultErrorComponent: ({ error }) => <RouterErrorComponent error={error} />,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
