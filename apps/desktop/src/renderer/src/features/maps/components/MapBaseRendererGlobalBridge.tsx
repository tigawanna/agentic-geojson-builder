import { useEffect } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import {
  useMapBaseRendererQuery,
  useSetMapBaseRendererMutation,
} from "@renderer/features/maps/hooks/useMapBaseRenderer";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";

export function MapBaseRendererGlobalBridge() {
  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";
  const mapboxTokenAvailable = (useMapboxTokenQuery().data ?? null) !== null;
  const setBaseRenderer = useSetMapBaseRendererMutation();

  useEffect(() => {
    void ipcInvoke("mapWorkspaceMenu:patchState", {
      baseRenderer,
      mapboxTokenAvailable,
    });
  }, [baseRenderer, mapboxTokenAvailable]);

  useIpcEvent("app:menuAction", (action) => {
    if (action.type !== "map-workspace-menu") {
      return;
    }

    if (action.id === "base-renderer:leaflet") {
      void setBaseRenderer.mutateAsync("leaflet");
      return;
    }

    if (action.id === "base-renderer:mapbox-gl") {
      void setBaseRenderer.mutateAsync("mapbox-gl");
    }
  });

  return null;
}
