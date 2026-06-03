import type { MapboxGlStyleId } from "@shared/mapbox-menu.types";
import { create } from "zustand";

type MapboxViewerUiStore = {
  styleId: MapboxGlStyleId;
  inspectMode: boolean;
  showPendingCaptures: boolean;
  showApprovedCaptures: boolean;
  setStyleId: (styleId: MapboxGlStyleId) => void;
  setInspectMode: (value: boolean) => void;
  toggleInspectMode: () => void;
  setShowPendingCaptures: (value: boolean) => void;
  setShowApprovedCaptures: (value: boolean) => void;
  toggleShowPendingCaptures: () => void;
  toggleShowApprovedCaptures: () => void;
};

export const useMapboxViewerUiStore = create<MapboxViewerUiStore>((set) => ({
  styleId: "outdoors",
  inspectMode: false,
  showPendingCaptures: true,
  showApprovedCaptures: true,
  setStyleId: (styleId) => set({ styleId }),
  setInspectMode: (inspectMode) => set({ inspectMode }),
  toggleInspectMode: () => set((state) => ({ inspectMode: !state.inspectMode })),
  setShowPendingCaptures: (showPendingCaptures) => set({ showPendingCaptures }),
  setShowApprovedCaptures: (showApprovedCaptures) => set({ showApprovedCaptures }),
  toggleShowPendingCaptures: () =>
    set((state) => ({ showPendingCaptures: !state.showPendingCaptures })),
  toggleShowApprovedCaptures: () =>
    set((state) => ({ showApprovedCaptures: !state.showApprovedCaptures })),
}));
