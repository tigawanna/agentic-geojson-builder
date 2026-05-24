import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "./-components/AuthLayout";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});
