import { createFileRoute } from "@tanstack/react-router";
import { MapAlignmentWorkspace } from "./new/-components/MapAlignmentWorkspace";

export const Route = createFileRoute("/_dashboard/maps/new")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  return <MapAlignmentWorkspace />;
}
