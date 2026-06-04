import { create } from "zustand";

export const DATA_EXPLORER_STATUS_TOAST_MS = 5000;
import type {
  MapDataExplorerSelection,
  MapDataExplorerTab,
} from "@renderer/features/maps/types/map-data-explorer.types";

export type MapDataExplorerEditTarget =
  | { kind: "control-point"; id: number }
  | { kind: "map-point"; id: number };

type MapDataExplorerPageState = {
  tab: MapDataExplorerTab;
  selection: MapDataExplorerSelection | null;
  highlightedSegmentId: number | null;
  highlightedPathGroupId: string | null;
  showReferenceOverlay: boolean;
  showReferenceInspectTooltip: boolean;
  mapboxInspectMode: boolean;
  editTarget: MapDataExplorerEditTarget | null;
  statusMessage: string | null;
  setTab: (tab: MapDataExplorerTab) => void;
  setSelection: (selection: MapDataExplorerSelection | null) => void;
  setHighlightedSegmentId: (segmentId: number | null) => void;
  setHighlightedPathGroupId: (groupId: string | null) => void;
  setShowReferenceOverlay: (show: boolean) => void;
  setShowReferenceInspectTooltip: (show: boolean) => void;
  setMapboxInspectMode: (enabled: boolean) => void;
  toggleMapboxInspectMode: () => void;
  setEditTarget: (target: MapDataExplorerEditTarget | null) => void;
  setStatusMessage: (message: string | null) => void;
  reset: () => void;
};

const initialState = {
  tab: "points" as MapDataExplorerTab,
  selection: null as MapDataExplorerSelection | null,
  highlightedSegmentId: null as number | null,
  highlightedPathGroupId: null as string | null,
  showReferenceOverlay: true,
  showReferenceInspectTooltip: true,
  mapboxInspectMode: false,
  editTarget: null as MapDataExplorerEditTarget | null,
  statusMessage: null as string | null,
};

export const useMapDataExplorerPageStore = create<MapDataExplorerPageState>((set) => ({
  ...initialState,
  setTab: (tab) => set({ tab }),
  setSelection: (selection) => set({ selection }),
  setHighlightedSegmentId: (highlightedSegmentId) =>
    set({ highlightedSegmentId, highlightedPathGroupId: null }),
  setHighlightedPathGroupId: (highlightedPathGroupId) =>
    set({ highlightedPathGroupId, highlightedSegmentId: null }),
  setShowReferenceOverlay: (showReferenceOverlay) => set({ showReferenceOverlay }),
  setShowReferenceInspectTooltip: (showReferenceInspectTooltip) =>
    set({ showReferenceInspectTooltip }),
  setMapboxInspectMode: (mapboxInspectMode) => set({ mapboxInspectMode }),
  toggleMapboxInspectMode: () => set((state) => ({ mapboxInspectMode: !state.mapboxInspectMode })),
  setEditTarget: (editTarget) => set({ editTarget }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  reset: () => set(initialState),
}));
