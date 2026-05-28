import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { AppMenuAction } from "@shared/menu.types";
import { useCreateMapWizardStore } from "@renderer/features/maps/store/create-map-wizard-store";

export function useAppMenuActions() {
  const navigate = useNavigate();

  useEffect(() => {
    return window.api.on("app:menuAction", (action: AppMenuAction) => {
      switch (action.type) {
        case "navigate":
          void navigate({ to: action.path });
          return;
        case "new-map-project":
          void navigate({ to: "/maps" });
          useCreateMapWizardStore.getState().open();
          return;
        case "map-open":
          void navigate({ to: "/maps/$mapId", params: { mapId: String(action.mapId) } });
          return;
        case "check-updates":
          void window.api.invoke("updater:check", undefined);
          return;
      }
    });
  }, [navigate]);
}
