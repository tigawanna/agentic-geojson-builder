import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@renderer/features/home/HomePage";

export const Route = createFileRoute("/")({
  component: HomePage,
});
