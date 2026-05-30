import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

import type { MapViewport } from "@renderer/features/maps/lib/map-handle";
import type { GeoSegmentPathKind } from "@shared/geo-segments.types";
import type { SourcePanelPresentation } from "@shared/workspace-layout.types";

type MapWorkspaceUiState = {
  controlsOpen: boolean;
  tileCacheBoundsOpen: boolean;
  homeViewport: MapViewport | null;
  cursorCoordinates: MapCoordinates | null;
  selectedCoordinates: MapCoordinates | null;
  statusMessage: string | null;
  referenceMode: boolean;
  traceMode: boolean;
  showReferenceOverlay: boolean;
  showReferenceInspectTooltip: boolean;
  controlPointDragEnabled: boolean;
  sourcePanelPresentation: SourcePanelPresentation;
  mapPanelCollapsed: boolean;
  pendingMapPoint: MapCoordinates | null;
  pendingTracePoints: MapCoordinates[];
  selectedControlPointId: number | null;
  detailPanelControlPointId: number | null;
  editingSegmentId: number | null;
  segmentGroupId: string;
  segmentName: string;
  segmentPathKind: GeoSegmentPathKind;
};

type MapWorkspaceUiActions = {
  openControls: () => void;
  closeControls: () => void;
  openTileCacheBounds: () => void;
  closeTileCacheBounds: () => void;
  setHomeViewport: (viewport: MapViewport | null) => void;
  setCursorCoordinates: (coordinates: MapCoordinates | null) => void;
  setSelectedCoordinates: (coordinates: MapCoordinates | null) => void;
  setStatusMessage: (message: string | null) => void;
  setReferenceMode: (enabled: boolean) => void;
  setTraceMode: (enabled: boolean) => void;
  setShowReferenceOverlay: (visible: boolean) => void;
  setShowReferenceInspectTooltip: (visible: boolean) => void;
  setControlPointDragEnabled: (enabled: boolean) => void;
  setSourcePanelPresentation: (presentation: SourcePanelPresentation) => void;
  setMapPanelCollapsed: (collapsed: boolean) => void;
  setPendingMapPoint: (point: MapCoordinates | null) => void;
  setPendingTracePoints: (
    points: MapCoordinates[] | ((current: MapCoordinates[]) => MapCoordinates[]),
  ) => void;
  setSelectedControlPointId: (controlPointId: number | null) => void;
  setDetailPanelControlPointId: (controlPointId: number | null) => void;
  setEditingSegmentId: (segmentId: number | null) => void;
  setSegmentGroupId: (segmentGroupId: string) => void;
  setSegmentName: (name: string) => void;
  setSegmentPathKind: (pathKind: GeoSegmentPathKind) => void;
  stopReferenceMode: () => void;
  stopTraceMode: () => void;
  reset: () => void;
};

export type MapWorkspaceUiStore = StoreApi<MapWorkspaceUiState & MapWorkspaceUiActions>;

const initialState: MapWorkspaceUiState = {
  controlsOpen: false,
  tileCacheBoundsOpen: false,
  homeViewport: null,
  cursorCoordinates: null,
  selectedCoordinates: null,
  statusMessage: null,
  referenceMode: false,
  traceMode: false,
  showReferenceOverlay: true,
  showReferenceInspectTooltip: true,
  controlPointDragEnabled: false,
  sourcePanelPresentation: "docked",
  mapPanelCollapsed: false,
  pendingMapPoint: null,
  pendingTracePoints: [],
  selectedControlPointId: null,
  detailPanelControlPointId: null,
  editingSegmentId: null,
  segmentGroupId: "10k-blue",
  segmentName: "",
  segmentPathKind: "walking-trail",
};

export function createMapWorkspaceUiStore(): MapWorkspaceUiStore {
  return createStore<MapWorkspaceUiState & MapWorkspaceUiActions>((set) => ({
    ...initialState,
    openControls: () => set({ controlsOpen: true }),
    closeControls: () => set({ controlsOpen: false }),
    openTileCacheBounds: () => set({ tileCacheBoundsOpen: true, controlsOpen: false }),
    closeTileCacheBounds: () => set({ tileCacheBoundsOpen: false }),
    setHomeViewport: (homeViewport) => set({ homeViewport }),
    setCursorCoordinates: (cursorCoordinates) => set({ cursorCoordinates }),
    setSelectedCoordinates: (selectedCoordinates) => set({ selectedCoordinates }),
    setStatusMessage: (statusMessage) => set({ statusMessage }),
    setReferenceMode: (referenceMode) => set({ referenceMode }),
    setTraceMode: (traceMode) => set({ traceMode }),
    setShowReferenceOverlay: (showReferenceOverlay) => set({ showReferenceOverlay }),
    setShowReferenceInspectTooltip: (showReferenceInspectTooltip) =>
      set({ showReferenceInspectTooltip }),
    setControlPointDragEnabled: (controlPointDragEnabled) => set({ controlPointDragEnabled }),
    setSourcePanelPresentation: (sourcePanelPresentation) => set({ sourcePanelPresentation }),
    setMapPanelCollapsed: (mapPanelCollapsed) => set({ mapPanelCollapsed }),
    setPendingMapPoint: (pendingMapPoint) => set({ pendingMapPoint }),
    setPendingTracePoints: (pendingTracePoints) =>
      set((state) => ({
        pendingTracePoints:
          typeof pendingTracePoints === "function"
            ? pendingTracePoints(state.pendingTracePoints)
            : pendingTracePoints,
      })),
    setSelectedControlPointId: (selectedControlPointId) => set({ selectedControlPointId }),
    setDetailPanelControlPointId: (detailPanelControlPointId) =>
      set({ detailPanelControlPointId, selectedControlPointId: detailPanelControlPointId }),
    setEditingSegmentId: (editingSegmentId) => set({ editingSegmentId }),
    setSegmentGroupId: (segmentGroupId) => set({ segmentGroupId }),
    setSegmentName: (segmentName) => set({ segmentName }),
    setSegmentPathKind: (segmentPathKind) => set({ segmentPathKind }),
    stopReferenceMode: () =>
      set({ referenceMode: false, pendingMapPoint: null, selectedControlPointId: null }),
    stopTraceMode: () =>
      set({
        traceMode: false,
        pendingTracePoints: [],
        editingSegmentId: null,
      }),
    reset: () => set(initialState),
  }));
}

export function useScopedMapWorkspaceUiStore<T>(
  store: MapWorkspaceUiStore,
  selector: (state: MapWorkspaceUiState & MapWorkspaceUiActions) => T,
): T {
  return useStore(store, selector);
}
