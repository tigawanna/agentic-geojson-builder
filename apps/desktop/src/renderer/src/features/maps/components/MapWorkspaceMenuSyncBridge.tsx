import type { MapWorkspaceMenuSyncState } from "@shared/map-workspace-menu.types";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import { useMapBaseRendererQuery } from "@renderer/features/maps/hooks/useMapBaseRenderer";
import { resolveMapboxGlStyleId } from "@renderer/features/maps/lib/mapbox-gl-styles";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

type MapWorkspaceMenuSyncBridgeProps = {
  hasSourceFile: boolean;
  segmentCount: number;
  exportPending: boolean;
};

function isMapViewRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "");
  return /^\/maps\/\d+$/.test(normalized) || /^\/data\/\d+$/.test(normalized);
}

export function MapWorkspaceMenuSyncBridge({
  hasSourceFile,
  segmentCount,
  exportPending,
}: MapWorkspaceMenuSyncBridgeProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const traceMode = useMapWorkspaceUiState((state) => state.traceMode);
  const markerMode = useMapWorkspaceUiState((state) => state.markerMode);
  const linkMode = useMapWorkspaceUiState((state) => state.linkMode);
  const showReferenceOverlay = useMapWorkspaceUiState((state) => state.showReferenceOverlay);
  const showReferenceInspectTooltip = useMapWorkspaceUiState(
    (state) => state.showReferenceInspectTooltip,
  );
  const controlPointDragEnabled = useMapWorkspaceUiState((state) => state.controlPointDragEnabled);
  const mapboxInspectMode = useMapWorkspaceUiState((state) => state.mapboxInspectMode);
  const showNeighborCoverage = useMapWorkspaceUiState((state) => state.showNeighborCoverage);
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(workspace?.id ?? null);
  const hasReferenceGeoJson = (referenceGeoJsonQuery.data?.layers.length ?? 0) > 0;
  const mapboxTokenAvailable = (useMapboxTokenQuery().data ?? null) !== null;

  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";
  const mapboxGlStyle = resolveMapboxGlStyleId(
    workspace?.mapboxGlStyle ?? null,
    workspace?.baseMapStyle ?? "standard",
  );

  useEffect(() => {
    const payload: MapWorkspaceMenuSyncState = {
      routeActive: isMapViewRoute(pathname) && workspace !== null,
      referenceMode,
      traceMode,
      markerMode,
      linkMode,
      hasSourceFile,
      hasReferenceGeoJson,
      showReferenceOverlay,
      showReferenceInspectTooltip,
      controlPointDragEnabled,
      baseRenderer,
      mapboxGlStyle,
      mapboxInspectMode,
      showNeighborCoverage,
      mapboxTokenAvailable,
      segmentCount,
      exportPending,
    };
    void window.api.invoke("mapWorkspaceMenu:syncState", payload);
  }, [
    pathname,
    workspace,
    referenceMode,
    traceMode,
    markerMode,
    linkMode,
    hasSourceFile,
    hasReferenceGeoJson,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    controlPointDragEnabled,
    baseRenderer,
    mapboxGlStyle,
    mapboxInspectMode,
    showNeighborCoverage,
    mapboxTokenAvailable,
    segmentCount,
    exportPending,
  ]);

  return null;
}
