import { createFileRoute } from "@tanstack/react-router";
import { MapProjectsPage } from "./-components/MapProjectsPage";

export const Route = createFileRoute("/_dashboard/map-projects/")({
  component: MapProjectsPage,
  head: () => ({
    meta: [
      {
        title: "Map Projects",
        description: "Create source map projects and shape GeoJSON extraction workflows.",
      },
    ],
  }),
});
