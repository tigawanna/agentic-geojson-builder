import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy } from "react";

const PgliteLayout = lazy(() => import("./-components/PgliteLayout"));

export const Route = createFileRoute("/_dashboard/pglite")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <PgliteLayout>
      <Outlet />
    </PgliteLayout>
  );
}
