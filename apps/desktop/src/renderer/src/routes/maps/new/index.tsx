import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCreateMapWizardStore } from "@renderer/features/maps/store/create-map-wizard-store";

export const Route = createFileRoute("/maps/new/")({
  component: CreateMapNewRedirect,
});

function CreateMapNewRedirect() {
  const navigate = useNavigate();
  const openWizard = useCreateMapWizardStore((state) => state.open);

  useEffect(() => {
    openWizard();
    void navigate({ to: "/maps", replace: true });
  }, [navigate, openWizard]);

  return null;
}
