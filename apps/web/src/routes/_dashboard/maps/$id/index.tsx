import { createFileRoute } from "@tanstack/react-router";
import { MapAlignmentWorkspace } from "../new/-components/MapAlignmentWorkspace";

export const Route = createFileRoute("/_dashboard/maps/$id/")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <MapAlignmentWorkspace mapId={Number(id)} />;
}
