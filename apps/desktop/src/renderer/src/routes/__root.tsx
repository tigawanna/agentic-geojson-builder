import { createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@renderer/components/AppLayout";
import { RouterErrorComponent } from "@renderer/lib/tanstack/router/RouterErrorComponent";
import { RouterNotFoundComponent } from "@renderer/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@renderer/lib/tanstack/router/RouterPendingComponent";

export const Route = createRootRoute({
  component: AppLayout,
  pendingComponent: () => <RouterPendingComponent />,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: ({ error }) => <RouterErrorComponent error={error} />,
});
