import { createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "../components/AppLayout";
import { RouterErrorComponent } from "../lib/tanstack/router/RouterErrorComponent";
import { RouterNotFoundComponent } from "../lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "../lib/tanstack/router/RouterPendingComponent";

export const Route = createRootRoute({
  component: AppLayout,
  pendingComponent: () => <RouterPendingComponent />,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: ({ error }) => <RouterErrorComponent error={error} />,
});
