import { createFileRoute } from "@tanstack/react-router";
import { MapWorkspacePage } from "../../../features/maps/MapWorkspacePage";

export const Route = createFileRoute("/maps/$mapId/")({
  component: MapWorkspaceRoutePage,
});

function MapWorkspaceRoutePage() {
  const { mapId } = Route.useParams();
  return <MapWorkspacePage mapId={Number(mapId)} />;
}
