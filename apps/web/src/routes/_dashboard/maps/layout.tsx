import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/maps")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  return <Outlet />;
}
