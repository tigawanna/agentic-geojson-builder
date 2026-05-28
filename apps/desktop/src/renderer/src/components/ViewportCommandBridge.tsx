import type { SetMapViewportEvent } from "@shared/rendered-map-view.types";
import { getViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function ViewportCommandBridge() {
  useIpcEvent("workspace:setMapViewport", (payload: SetMapViewportEvent) => {
    void handleViewportCommand(payload);
  });

  return null;
}

async function handleViewportCommand(payload: SetMapViewportEvent) {
  const handler = getViewportCommand(payload.mapId);
  if (!handler) {
    await window.api.invoke("workspace:setMapViewportResponse", {
      requestId: payload.requestId,
      error: "No map workspace is open for this map.",
    });
    return;
  }

  try {
    const viewport = handler({
      latitude: payload.latitude,
      longitude: payload.longitude,
      zoom: payload.zoom,
      fitBounds: payload.fitBounds,
    });

    await window.api.invoke("workspace:setMapViewportResponse", {
      requestId: payload.requestId,
      viewport,
    });
  } catch (error) {
    await window.api.invoke("workspace:setMapViewportResponse", {
      requestId: payload.requestId,
      error: error instanceof Error ? error.message : "Viewport command failed.",
    });
  }
}
