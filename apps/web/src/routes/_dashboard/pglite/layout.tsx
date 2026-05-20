import { createFileRoute, Outlet } from "@tanstack/react-router";
import PgliteLayout from "./-components/PgliteLayout";

export const Route = createFileRoute("/_dashboard/pglite")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PgliteLayout>
      <Outlet />
    </PgliteLayout>
  );
}
