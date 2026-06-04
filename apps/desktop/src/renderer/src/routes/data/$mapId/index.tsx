import { createFileRoute } from "@tanstack/react-router";
import { MapDataExplorerPage } from "@renderer/features/maps/MapDataExplorerPage";

export const Route = createFileRoute("/data/$mapId/")({
  component: DataExplorerRoutePage,
});

function DataExplorerRoutePage() {
  const { mapId } = Route.useParams();
  return <MapDataExplorerPage mapId={Number(mapId)} />;
}
