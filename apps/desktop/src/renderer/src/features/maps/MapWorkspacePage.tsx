import { MapWorkspaceSplitView } from "./components/MapWorkspaceSplitView";
import { useHydrateMapWorkspace } from "./hooks/useHydrateMapWorkspace";
import {
  MapWorkspaceProvider,
  useMapWorkspacePhase,
  useMapWorkspaceState,
} from "./store/MapWorkspaceProvider";

function MapWorkspaceContent({ mapId }: { mapId: number }) {
  useHydrateMapWorkspace(mapId);
  const phase = useMapWorkspacePhase();
  const errorMessage = useMapWorkspaceState((state) => state.errorMessage);

  if (phase === "loading" || phase === "creating") {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-lg loading-spinner text-primary" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-error">{errorMessage ?? "Failed to load map workspace"}</p>
      </div>
    );
  }

  return <MapWorkspaceSplitView />;
}

export function MapWorkspacePage({ mapId }: { mapId: number }) {
  return (
    <MapWorkspaceProvider>
      <MapWorkspaceContent mapId={mapId} />
    </MapWorkspaceProvider>
  );
}
