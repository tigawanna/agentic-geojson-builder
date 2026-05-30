import { createFileRoute } from "@tanstack/react-router";
import { MapSourceDocumentWindowPage } from "@renderer/features/maps/MapSourceDocumentWindowPage";

export const Route = createFileRoute("/maps/$mapId/source")({
  component: MapSourceDocumentRoutePage,
});

function MapSourceDocumentRoutePage() {
  const { mapId } = Route.useParams();
  return <MapSourceDocumentWindowPage mapId={Number(mapId)} />;
}
