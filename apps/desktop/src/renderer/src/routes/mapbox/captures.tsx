import { createFileRoute } from "@tanstack/react-router";
import { MapboxCapturesPage } from "@renderer/features/mapbox-viewer/MapboxCapturesPage";

export const Route = createFileRoute("/mapbox/captures")({
  component: MapboxCapturesPage,
});
