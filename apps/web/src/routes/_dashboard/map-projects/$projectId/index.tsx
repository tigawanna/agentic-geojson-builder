import { createFileRoute } from "@tanstack/react-router";
import { MapProjectWorkspacePage } from "../-components/MapProjectWorkspacePage";

export const Route = createFileRoute("/_dashboard/map-projects/$projectId/")({
  component: MapProjectWorkspacePage,
  head: () => ({
    meta: [
      {
        title: "Map Project Workspace",
        description: "Review source assets and prepare GeoJSON extraction for a map project.",
      },
    ],
  }),
});
