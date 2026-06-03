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
  segmentCount: 0,
  exportPending: false,
};
