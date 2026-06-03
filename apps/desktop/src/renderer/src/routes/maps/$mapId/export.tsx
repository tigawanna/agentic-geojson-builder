import { createFileRoute } from "@tanstack/react-router";
import { MapExportPage } from "@renderer/features/maps/MapExportPage";

export const Route = createFileRoute("/maps/$mapId/export")({
  component: MapExportRoutePage,
});

function MapExportRoutePage() {
  const { mapId } = Route.useParams();
  return <MapExportPage mapId={Number(mapId)} />;
}
