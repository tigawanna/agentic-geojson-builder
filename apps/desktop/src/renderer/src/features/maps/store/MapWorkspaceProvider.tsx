import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  createMapWorkspaceStore,
  useScopedMapWorkspaceStore,
  type MapWorkspacePhase,
  type MapWorkspaceStore,
} from "@renderer/features/maps/store/map-workspace-store";
import {
  createMapWorkspaceUiStore,
  useScopedMapWorkspaceUiStore,
  type MapWorkspaceUiStore,
} from "@renderer/features/maps/store/map-workspace-ui-store";

const MapWorkspaceStoreContext = createContext<MapWorkspaceStore | null>(null);
const MapWorkspaceUiStoreContext = createContext<MapWorkspaceUiStore | null>(null);

export function MapWorkspaceProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<MapWorkspaceStore | null>(null);
  const uiStoreRef = useRef<MapWorkspaceUiStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createMapWorkspaceStore();
  }
  if (!uiStoreRef.current) {
    uiStoreRef.current = createMapWorkspaceUiStore();
  }

  return (
    <MapWorkspaceStoreContext.Provider value={storeRef.current}>
      <MapWorkspaceUiStoreContext.Provider value={uiStoreRef.current}>
        {children}
      </MapWorkspaceUiStoreContext.Provider>
    </MapWorkspaceStoreContext.Provider>
  );
}

function useWorkspaceStoreApi(): MapWorkspaceStore {
  const store = useContext(MapWorkspaceStoreContext);
  if (!store) {
    throw new Error("MapWorkspaceProvider is required");
  }
  return store;
}

function useWorkspaceUiStoreApi(): MapWorkspaceUiStore {
  const store = useContext(MapWorkspaceUiStoreContext);
  if (!store) {
    throw new Error("MapWorkspaceProvider is required");
  }
  return store;
}

export function useMapWorkspaceState<T>(
  selector: (state: ReturnType<MapWorkspaceStore["getState"]>) => T,
): T {
  const store = useWorkspaceStoreApi();
  return useScopedMapWorkspaceStore(store, selector);
}

export function useMapWorkspaceUiState<T>(
  selector: (state: ReturnType<MapWorkspaceUiStore["getState"]>) => T,
): T {
  const store = useWorkspaceUiStoreApi();
  return useScopedMapWorkspaceUiStore(store, selector);
}

export function useMapWorkspacePhase(): MapWorkspacePhase {
  return useMapWorkspaceState((state) => state.phase);
}

export function useMapWorkspaceActions() {
  const store = useWorkspaceStoreApi();
  return store.getState();
}

export function useMapWorkspaceUiActions() {
  const store = useWorkspaceUiStoreApi();
  return store.getState();
}
