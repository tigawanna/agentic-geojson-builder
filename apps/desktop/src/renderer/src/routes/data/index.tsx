import { createFileRoute } from "@tanstack/react-router";
import { DataListPage } from "@renderer/features/maps/DataListPage";

export const Route = createFileRoute("/data/")({
  component: DataListPage,
});
