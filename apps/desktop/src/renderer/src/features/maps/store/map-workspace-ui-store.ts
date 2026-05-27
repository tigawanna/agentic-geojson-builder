import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

import type { MapViewport } from "../lib/map-handle";

type MapWorkspaceUiState = {
  controlsOpen: boolean;
  tileCacheBoundsOpen: boolean;
  homeViewport: MapViewport | null;
  cursorCoordinates: MapCoordinates | null;
  selectedCoordinates: MapCoordinates | null;
  statusMessage: string | null;
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
    reset: () => set(initialState),
  }));
}

export function useScopedMapWorkspaceUiStore<T>(
  store: MapWorkspaceUiStore,
  selector: (state: MapWorkspaceUiState & MapWorkspaceUiActions) => T,
): T {
  return useStore(store, selector);
}
