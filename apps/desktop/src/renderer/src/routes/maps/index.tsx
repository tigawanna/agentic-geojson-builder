import { createFileRoute } from "@tanstack/react-router";
import { MapsListPage } from "../../features/maps/MapsListPage";

export const Route = createFileRoute("/maps/")({
  component: MapsListPage,
});
