import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  createMapWorkspaceStore,
  useScopedMapWorkspaceStore,
  type MapWorkspacePhase,
  type MapWorkspaceStore,
} from "./map-workspace-store";

const MapWorkspaceStoreContext = createContext<MapWorkspaceStore | null>(null);

export function MapWorkspaceProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<MapWorkspaceStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createMapWorkspaceStore();
  }

  return (
    <MapWorkspaceStoreContext.Provider value={storeRef.current}>
      {children}
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

export function useMapWorkspaceState<T>(
  selector: (state: ReturnType<MapWorkspaceStore["getState"]>) => T,
): T {
  const store = useWorkspaceStoreApi();
  return useScopedMapWorkspaceStore(store, selector);
}

export function useMapWorkspacePhase(): MapWorkspacePhase {
  return useMapWorkspaceState((state) => state.phase);
}

export function useMapWorkspaceActions() {
  const store = useWorkspaceStoreApi();
  return store.getState();
}
