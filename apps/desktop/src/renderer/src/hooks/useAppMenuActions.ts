import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { AppMenuAction } from "@shared/menu.types";
import { useCreateMapWizardStore } from "../features/maps/store/create-map-wizard-store";
import { useMapDeleteRequestStore } from "../features/maps/store/map-delete-request-store";

export function useAppMenuActions() {
  const navigate = useNavigate();
  const requestDelete = useMapDeleteRequestStore((state) => state.request);

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
        case "map-delete":
          requestDelete({ id: action.mapId, name: action.mapName });
          return;
        case "check-updates":
          void window.api.invoke("updater:check", undefined);
          return;
      }
    });
  }, [navigate, requestDelete]);
}
