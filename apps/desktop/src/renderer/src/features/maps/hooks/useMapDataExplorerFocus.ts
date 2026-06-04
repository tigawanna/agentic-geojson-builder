import { useEffect } from "react";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { getViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import { mergeMapBounds } from "@renderer/features/maps/lib/merge-map-bounds";
import { lineStringToMapBounds } from "@renderer/features/maps/lib/segment-utils";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type UseMapDataExplorerFocusInput = {
  mapId: number | null;
  controlPoints: ControlPointRecord[];
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
};

export function useMapDataExplorerFocus({
  mapId,
  controlPoints,
  mapPoints,
  geoSegments,
  mapLinks,
}: UseMapDataExplorerFocusInput) {
  const selection = useMapWorkspaceUiState((state) => state.dataExplorerSelection);
  const {
    setSelectedControlPointId,
    setDetailPanelControlPointId,
    setSelectedMapPointId,
    setDetailPanelMapPointId,
    setHighlightedSegmentId,
    setHighlightedPathGroupId,
  } = useMapWorkspaceUiActions();

  useEffect(() => {
    if (!mapId || !selection) {
      return;
    }

    const viewport = getViewportCommand(mapId);

    if (selection.kind === "control-point") {
      const point = controlPoints.find((entry) => entry.id === selection.id);
      if (!point) {
        return;
      }
      setHighlightedSegmentId(null);
      setHighlightedPathGroupId(null);
      setDetailPanelControlPointId(point.id);
      viewport?.({
        latitude: point.latitude,
        longitude: point.longitude,
        zoom: 17,
      });
      return;
    }

    if (selection.kind === "map-point") {
      const point = mapPoints.find((entry) => entry.id === selection.id);
      if (!point) {
        return;
      }
      setHighlightedSegmentId(null);
      setHighlightedPathGroupId(null);
      setSelectedControlPointId(null);
      setDetailPanelControlPointId(null);
      setDetailPanelMapPointId(point.id);
      viewport?.({
        latitude: point.latitude,
        longitude: point.longitude,
        zoom: 17,
      });
      return;
    }

    if (selection.kind === "segment") {
      const segment = geoSegments.find((entry) => entry.id === selection.id);
      if (!segment) {
        return;
      }
      setHighlightedPathGroupId(null);
      setHighlightedSegmentId(segment.id);
      setSelectedControlPointId(null);
      setDetailPanelControlPointId(null);
      setDetailPanelMapPointId(null);
      setSelectedMapPointId(null);
      const bounds = lineStringToMapBounds(segment.geometry.coordinates);
      if (bounds) {
        viewport?.({ fitBounds: bounds });
      }
      return;
    }

    if (selection.kind === "path") {
      const pathSegments = geoSegments.filter(
        (segment) => segment.segmentGroupId === selection.groupId,
      );
      if (pathSegments.length === 0) {
        return;
      }
      setHighlightedSegmentId(null);
      setHighlightedPathGroupId(selection.groupId);
      setSelectedControlPointId(null);
      setDetailPanelControlPointId(null);
      setDetailPanelMapPointId(null);
      setSelectedMapPointId(null);
      const bounds = mergeMapBounds(
        pathSegments.map((segment) => lineStringToMapBounds(segment.geometry.coordinates)),
      );
      if (bounds) {
        viewport?.({ fitBounds: bounds });
      }
      return;
    }

    if (selection.kind === "link") {
      const link = mapLinks.find((entry) => entry.id === selection.id);
      if (!link) {
        return;
      }
      const fromPoint = mapPoints.find((point) => point.ref === link.fromRef);
      const toPoint = mapPoints.find((point) => point.ref === link.toRef);
      const pathSegments = geoSegments.filter(
        (segment) => segment.segmentGroupId === link.pathSlug,
      );
      setHighlightedSegmentId(null);
      setHighlightedPathGroupId(link.pathSlug);
      setSelectedControlPointId(null);
      setDetailPanelControlPointId(null);
      setDetailPanelMapPointId(null);
      setSelectedMapPointId(null);

      const bounds = mergeMapBounds([
        fromPoint ? lineStringToMapBounds([[fromPoint.longitude, fromPoint.latitude]]) : null,
        toPoint ? lineStringToMapBounds([[toPoint.longitude, toPoint.latitude]]) : null,
        ...pathSegments.map((segment) => lineStringToMapBounds(segment.geometry.coordinates)),
      ]);
      if (bounds) {
        viewport?.({ fitBounds: bounds });
      }
    }
  }, [
    controlPoints,
    geoSegments,
    mapId,
    mapLinks,
    mapPoints,
    selection,
    setDetailPanelControlPointId,
    setDetailPanelMapPointId,
    setHighlightedPathGroupId,
    setHighlightedSegmentId,
    setSelectedControlPointId,
    setSelectedMapPointId,
  ]);
}

export function isMapDataExplorerSelectionEqual(
  current: MapDataExplorerSelection | null,
  next: MapDataExplorerSelection,
): boolean {
  if (!current) {
    return false;
  }
  if (current.kind !== next.kind) {
    return false;
  }
  if (current.kind === "path" && next.kind === "path") {
    return current.groupId === next.groupId;
  }
  if (current.kind === "link" && next.kind === "link") {
    return current.id === next.id;
  }
  if (
    (current.kind === "control-point" ||
      current.kind === "map-point" ||
      current.kind === "segment") &&
    (next.kind === "control-point" || next.kind === "map-point" || next.kind === "segment")
  ) {
    return current.id === next.id;
  }
  return false;
}
