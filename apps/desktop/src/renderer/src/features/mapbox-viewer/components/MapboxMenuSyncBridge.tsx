import type { MapboxMenuSyncState } from "@shared/mapbox-menu.types";
import { useMapboxViewerUiStore } from "@renderer/features/mapbox-viewer/store/mapbox-viewer-ui-store";
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

function isMapboxViewerRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === "/mapbox";
}

function buildSyncPayload(
  pathname: string,
  ui: Pick<
    MapboxMenuSyncState,
    "styleId" | "inspectMode" | "showPendingCaptures" | "showApprovedCaptures"
  >,
): MapboxMenuSyncState {
  return {
    routeActive: isMapboxViewerRoute(pathname),
    styleId: ui.styleId,
    inspectMode: ui.inspectMode,
    showPendingCaptures: ui.showPendingCaptures,
    showApprovedCaptures: ui.showApprovedCaptures,
  };
}

export function MapboxMenuSyncBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const styleId = useMapboxViewerUiStore((state) => state.styleId);
  const inspectMode = useMapboxViewerUiStore((state) => state.inspectMode);
  const showPendingCaptures = useMapboxViewerUiStore((state) => state.showPendingCaptures);
  const showApprovedCaptures = useMapboxViewerUiStore((state) => state.showApprovedCaptures);

  useEffect(() => {
    const payload = buildSyncPayload(pathname, {
      styleId,
      inspectMode,
      showPendingCaptures,
      showApprovedCaptures,
    });
    void window.api.invoke("mapboxMenu:syncState", payload);
  }, [pathname, styleId, inspectMode, showPendingCaptures, showApprovedCaptures]);

  return null;
}
