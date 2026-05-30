export type SourcePanelPresentation = "docked" | "collapsed" | "detached";

export type WorkspaceUiSyncState = {
  mapId: number;
  referenceMode: boolean;
  pendingMapPoint: { latitude: number; longitude: number } | null;
  selectedControlPointId: number | null;
};

export type WorkspaceSourceDocumentWindowClosedEvent = {
  mapId: number;
};
