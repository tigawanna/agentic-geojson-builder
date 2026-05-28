import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@renderer/features/settings/SettingsPage";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});
