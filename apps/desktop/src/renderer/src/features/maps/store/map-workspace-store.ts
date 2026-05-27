import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";
import type { MapSourceFilePayload, MapWorkspaceState } from "@shared/maps.types";

export type MapWorkspacePhase = "idle" | "creating" | "loading" | "ready" | "error";

type MapWorkspaceStoreState = {
  mapId: number | null;
  workspace: MapWorkspaceState | null;
  sourceFile: MapSourceFilePayload | null;
  phase: MapWorkspacePhase;
  errorMessage: string | null;
};

type MapWorkspaceStoreActions = {
  reset: () => void;
  setCreating: () => void;
  setLoading: (mapId: number) => void;
  setReady: (
    mapId: number,
    workspace: MapWorkspaceState,
    sourceFile: MapSourceFilePayload | null,
  ) => void;
  setError: (message: string) => void;
  setWorkspace: (workspace: MapWorkspaceState) => void;
  setSourceFile: (sourceFile: MapSourceFilePayload | null) => void;
  patchWorkspace: (patch: Partial<MapWorkspaceState>) => void;
};

export type MapWorkspaceStore = StoreApi<MapWorkspaceStoreState & MapWorkspaceStoreActions>;

const initialState: MapWorkspaceStoreState = {
  mapId: null,
  workspace: null,
  sourceFile: null,
  phase: "idle",
  errorMessage: null,
};

export function createMapWorkspaceStore(): MapWorkspaceStore {
  return createStore<MapWorkspaceStoreState & MapWorkspaceStoreActions>((set) => ({
    ...initialState,
    reset: () => set(initialState),
    setCreating: () => set({ phase: "creating", errorMessage: null }),
    setLoading: (mapId) => set({ mapId, phase: "loading", errorMessage: null }),
    setReady: (mapId, workspace, sourceFile) =>
      set({ mapId, workspace, sourceFile, phase: "ready", errorMessage: null }),
    setError: (message) => set({ phase: "error", errorMessage: message }),
    setWorkspace: (workspace) => set({ workspace }),
    setSourceFile: (sourceFile) => set({ sourceFile }),
    patchWorkspace: (patch) =>
      set((state) => (state.workspace ? { workspace: { ...state.workspace, ...patch } } : state)),
  }));
}

export const mapWorkspaceStore = createMapWorkspaceStore();

export function useMapWorkspaceStore<T>(
  selector: (state: MapWorkspaceStoreState & MapWorkspaceStoreActions) => T,
): T {
  return useStore(mapWorkspaceStore, selector);
}

export function useScopedMapWorkspaceStore<T>(
  store: MapWorkspaceStore,
  selector: (state: MapWorkspaceStoreState & MapWorkspaceStoreActions) => T,
): T {
  return useStore(store, selector);
}
