import { Activity, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LeafletMapPane } from "@renderer/features/maps/components/LeafletMapPane";
import { MapboxGlWorkspacePane } from "@renderer/features/maps/components/MapboxGlWorkspacePane";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import { useMapBaseRendererQuery } from "@renderer/features/maps/hooks/useMapBaseRenderer";
import { useMapPointsQuery } from "@renderer/features/maps/hooks/useMapPointsQuery";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import { useTileCacheStatusQuery } from "@renderer/features/maps/hooks/useTileCacheStatusQuery";
import { resolveLocalTileUrl } from "@renderer/features/maps/hooks/tile-cache-api";
import { mergeReferenceGeoJsonCollections } from "@repo/isomorphic/reference-geojson";
import type { MapHandle, MapViewport } from "@renderer/features/maps/lib/map-handle";
import { registerViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import { MapDataExplorerMapToolbar } from "@renderer/features/maps/components/MapDataExplorerMapToolbar";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import {
  useMapWorkspacePhase,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";

type MapDataExplorerMapPanelProps = {
  mapId: number;
};

function selectionToMapHighlight(selection: MapDataExplorerSelection | null) {
  if (!selection) {
    return {
      selectedControlPointId: null as number | null,
      selectedMapPointId: null as number | null,
    };
  }
  if (selection.kind === "control-point") {
    return { selectedControlPointId: selection.id, selectedMapPointId: null };
  }
  if (selection.kind === "map-point") {
    return { selectedControlPointId: null, selectedMapPointId: selection.id };
  }
  return { selectedControlPointId: null, selectedMapPointId: null };
}

export function MapDataExplorerMapPanel({ mapId }: MapDataExplorerMapPanelProps) {
  const { t } = useTranslation();
  const phase = useMapWorkspacePhase();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const selection = useMapDataExplorerPageStore((state) => state.selection);
  const highlightedSegmentId = useMapDataExplorerPageStore((state) => state.highlightedSegmentId);
  const highlightedPathGroupId = useMapDataExplorerPageStore(
    (state) => state.highlightedPathGroupId,
  );
  const showReferenceOverlay = useMapDataExplorerPageStore((state) => state.showReferenceOverlay);
  const showReferenceInspectTooltip = useMapDataExplorerPageStore(
    (state) => state.showReferenceInspectTooltip,
  );
  const mapboxInspectMode = useMapDataExplorerPageStore((state) => state.mapboxInspectMode);

  const controlPointsQuery = useControlPointsQuery(mapId);
  const mapPointsQuery = useMapPointsQuery(mapId);
  const geoSegmentsQuery = useGeoSegmentsQuery(mapId);
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(mapId);
  const tileCache = useTileCacheStatusQuery(mapId);
  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";

  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  const mapPoints = mapPointsQuery.data?.points ?? [];
  const geoSegments = geoSegmentsQuery.data?.segments ?? [];
  const referenceOverlay = useMemo(() => {
    const layers = referenceGeoJsonQuery.data?.layers ?? [];
    const visibleCollections = layers
      .filter((layer) => layer.visible)
      .map((layer) => layer.collection);
    if (visibleCollections.length === 0) {
      return null;
    }
    return mergeReferenceGeoJsonCollections(visibleCollections);
  }, [referenceGeoJsonQuery.data?.layers]);

  const mapHighlight = selectionToMapHighlight(selection);
  const mapboxGlActive = baseRenderer === "mapbox-gl";
  const mapHandleRef = useRef<MapHandle | null>(null);

  const handleViewportCommand = useCallback(
    (command: {
      latitude?: number;
      longitude?: number;
      zoom?: number;
      fitBounds?: { north: number; south: number; east: number; west: number };
    }) => {
      const mapHandle = mapHandleRef.current;
      if (!mapHandle) {
        return { latitude: 0, longitude: 0, zoom: 14 };
      }
      if (command.fitBounds) {
        return mapHandle.fitBounds(command.fitBounds);
      }
      if (command.latitude !== undefined && command.longitude !== undefined) {
        mapHandle.setViewport({
          latitude: command.latitude,
          longitude: command.longitude,
          zoom: command.zoom ?? mapHandle.getViewport().zoom,
        });
        return mapHandle.getViewport();
      }
      return mapHandle.getViewport();
    },
    [],
  );

  const handleMapReady = useCallback((handle: MapHandle) => {
    mapHandleRef.current = handle;
  }, []);

  useEffect(() => {
    return registerViewportCommand(mapId, handleViewportCommand);
  }, [handleViewportCommand, mapId]);

  const noopViewport = useCallback((_viewport: MapViewport) => {}, []);

  if (phase === "loading" || phase === "creating") {
    return (
      <div className="flex h-full items-center justify-center bg-base-200">
        <span className="loading loading-lg loading-spinner text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center bg-base-200 px-4 text-center text-sm text-base-content/55">
        {t("maps.workspace.dataExplorer.mapUnavailable")}
      </div>
    );
  }

  const localTileUrl = resolveLocalTileUrl(workspace.id, workspace.baseMapStyle, tileCache.data);

  const sharedPaneProps = {
    workspace,
    localTileUrl,
    tileCacheOverlay: tileCache.data?.bounds ?? null,
    referenceOverlay: showReferenceOverlay ? referenceOverlay : null,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    controlPoints,
    geoSegments,
    mapPoints,
    selectedMapPointId: mapHighlight.selectedMapPointId,
    linkFromPointId: null,
    pendingMapPoint: null,
    pendingTracePoints: [],
    canPickMapPoint: false,
    canPickTracePoint: false,
    canPlaceMapPoint: false,
    controlPointDragEnabled: false,
    editingSegmentId: null,
    selectedControlPointId: mapHighlight.selectedControlPointId,
    selectedSegmentId: highlightedSegmentId,
    highlightedPathGroupId,
    onReady: handleMapReady,
    onViewportChange: noopViewport,
    onCursorMove: () => {},
    onCoordinateSelect: noopViewport,
  };

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden bg-base-300"
      data-test="data-explorer-map"
    >
      <Activity mode={mapboxGlActive ? "hidden" : "visible"}>
        <LeafletMapPane {...sharedPaneProps} />
      </Activity>
      <Activity mode={mapboxGlActive ? "visible" : "hidden"}>
        <MapboxGlWorkspacePane {...sharedPaneProps} inspectMode={mapboxInspectMode} />
      </Activity>
      <MapDataExplorerMapToolbar mapId={mapId} />
      {(showReferenceInspectTooltip || mapboxInspectMode) && (
        <div className="pointer-events-none absolute right-2 bottom-2 max-w-[14rem] rounded-md bg-base-100/90 px-2 py-1 text-[10px] text-base-content/55 shadow-sm">
          {t("maps.workspace.dataExplorer.inspect.copyHint")}
        </div>
      )}
    </div>
  );
}
