import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@renderer/features/about/AboutPage";

export const Route = createFileRoute("/about/")({
  component: AboutPage,
});
