import type { MapWorkspaceState } from "@shared/maps.types";
import { DEFAULT_MAP_VIEWPORT, type MapViewport } from "./map-handle";

export function getWorkspaceHomeViewport(workspace: MapWorkspaceState): MapViewport {
  return {
    latitude: workspace.mapCenterLat ?? DEFAULT_MAP_VIEWPORT.latitude,
    longitude: workspace.mapCenterLng ?? DEFAULT_MAP_VIEWPORT.longitude,
    zoom: workspace.mapZoom ?? DEFAULT_MAP_VIEWPORT.zoom,
  };
}
