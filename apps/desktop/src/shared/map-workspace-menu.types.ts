import type { MapBaseRenderer } from "./maps.types.js";
import type { MapboxGlStyleId } from "./mapbox-menu.types.js";

export type MapWorkspaceMenuSyncState = {
  routeActive: boolean;
  referenceMode: boolean;
  traceMode: boolean;
  markerMode: boolean;
  linkMode: boolean;
  hasSourceFile: boolean;
  hasReferenceGeoJson: boolean;
  showReferenceOverlay: boolean;
  showReferenceInspectTooltip: boolean;
  controlPointDragEnabled: boolean;
  baseRenderer: MapBaseRenderer;
  mapboxGlStyle: MapboxGlStyleId;
  mapboxInspectMode: boolean;
  mapboxTokenAvailable: boolean;
  segmentCount: number;
  exportPending: boolean;
};

export const DEFAULT_MAP_WORKSPACE_MENU_SYNC_STATE: MapWorkspaceMenuSyncState = {
  routeActive: false,
  referenceMode: false,
  traceMode: false,
  markerMode: false,
  linkMode: false,
  hasSourceFile: false,
  hasReferenceGeoJson: false,
  showReferenceOverlay: true,
  showReferenceInspectTooltip: false,
  controlPointDragEnabled: false,
  baseRenderer: "leaflet",
  mapboxGlStyle: "outdoors",
  mapboxInspectMode: false,
  mapboxTokenAvailable: false,
  segmentCount: 0,
  exportPending: false,
};
