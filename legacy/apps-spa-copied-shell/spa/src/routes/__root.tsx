import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { QueryClient } from "@tanstack/react-query";
import { TViewer } from "@/data-access-layer/users/viewer";
import { Toaster } from "@/components/ui/sonner";
import { z } from "zod";

import "@/view-transition/angled-transition.css";
import "@/view-transition/wipe-transition.css";
import "@/view-transition/slides-transition.css";
import "@/view-transition/flip-transition.css";
import "@/view-transition/vertical-transition.css";
import { TanstackDevtools } from "@/lib/tanstack/devtools/devtools";

const searchparams = z.object({
  globalPage: z.number().optional(),
  globalSearch: z.string().optional(),
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  viewer?: TViewer;
}>()({
  component: RootComponent,
  validateSearch: (search) => searchparams.parse(search),
});

export function RootComponent() {
  return (
    <div className="content bg-base-100 min-h-screen w-full">
      <Outlet />
      <Toaster />
      <TanstackDevtools />
    </div>
  );
}
