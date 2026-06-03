import { createFileRoute } from "@tanstack/react-router";
import { MapboxViewerPage } from "@renderer/features/mapbox-viewer/MapboxViewerPage";

export const Route = createFileRoute("/mapbox/")({
  component: MapboxViewerPage,
});
