import { useTranslation } from "react-i18next";
import { MapWorkspaceSourceDocumentPane } from "@renderer/features/maps/components/MapWorkspaceSourceDocumentPane";
import { useHydrateMapWorkspace } from "@renderer/features/maps/hooks/useHydrateMapWorkspace";
import { useWorkspaceMapsChangedRefresh } from "@renderer/features/maps/hooks/useWorkspaceMapsChangedRefresh";
import { useWorkspaceUiSyncSubscriber } from "@renderer/features/maps/hooks/useWorkspaceUiSync";
import {
  MapWorkspaceProvider,
  useMapWorkspacePhase,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

function MapSourceDocumentWindowContent({ mapId }: { mapId: number }) {
  const { t } = useTranslation();
  useHydrateMapWorkspace(mapId);
  useWorkspaceMapsChangedRefresh(mapId);
  useWorkspaceUiSyncSubscriber(mapId);

  const phase = useMapWorkspacePhase();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const errorMessage = useMapWorkspaceState((state) => state.errorMessage);

  if (phase === "loading" || phase === "creating") {
    return (
      <div className="flex h-full items-center justify-center bg-base-200">
        <span className="loading loading-lg loading-spinner text-primary" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-full items-center justify-center bg-base-200 px-6 text-center">
        <p className="text-sm text-error">{errorMessage ?? "Failed to load source document"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-200">
      <div className="shrink-0 border-b border-base-300 px-4 py-2">
        <p className="text-sm font-semibold">
          {workspace?.name ?? t("maps.workspace.panels.sourceDocument")}
        </p>
        <p className="text-xs text-base-content/55">{t("maps.workspace.panels.popOutHint")}</p>
      </div>
      <div className="relative min-h-0 flex-1">
        <MapWorkspaceSourceDocumentPane registerCapture />
      </div>
    </div>
  );
}

export function MapSourceDocumentWindowPage({ mapId }: { mapId: number }) {
  return (
    <MapWorkspaceProvider>
      <MapSourceDocumentWindowContent mapId={mapId} />
    </MapWorkspaceProvider>
  );
}
