import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/two")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/dashboard/two"!</div>;
}
