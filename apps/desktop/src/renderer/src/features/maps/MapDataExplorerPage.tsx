import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@renderer/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@renderer/components/common/Resizable";
import { AppStatusToast } from "@renderer/components/common/AppStatusToast";
import { MapDataExplorerDetailsPanel } from "@renderer/features/maps/components/MapDataExplorerDetailsPanel";
import { MapDataExplorerEditDialog } from "@renderer/features/maps/components/MapDataExplorerEditDialog";
import { MapDataExplorerMapPanel } from "@renderer/features/maps/components/MapDataExplorerMapPanel";
import { MapDataExplorerTables } from "@renderer/features/maps/components/MapDataExplorerTables";
import { useDataExplorerInspectCopyShortcut } from "@renderer/features/maps/hooks/useDataExplorerInspectCopyShortcut";
import { useDataExplorerInspectViewHotkeys } from "@renderer/features/maps/hooks/useDataExplorerInspectViewHotkeys";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import { useMapDataExplorerFocus } from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useLinkRoutePlanner } from "@renderer/features/maps/hooks/useLinkRoutePlanner";
import { useMapLinksQuery } from "@renderer/features/maps/hooks/useMapLinksQuery";
import { useMapPointsQuery } from "@renderer/features/maps/hooks/useMapPointsQuery";
import { useMarkerNeighborsQuery } from "@renderer/features/maps/hooks/useMarkerNeighborsQuery";
import { useTrailsQuery } from "@renderer/features/maps/hooks/useTrailsQuery";
import { useHydrateMapWorkspace } from "@renderer/features/maps/hooks/useHydrateMapWorkspace";
import { useMapWorkspaceMenuActions } from "@renderer/features/maps/hooks/useMapWorkspaceMenuActions";
import { usePersistedNeighborCoveragePreference } from "@renderer/features/maps/hooks/usePersistedNeighborCoveragePreference";
import { MapWorkspaceMenuSyncBridge } from "@renderer/features/maps/components/MapWorkspaceMenuSyncBridge";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import {
  MapWorkspaceProvider,
  useMapWorkspacePhase,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import type { MapDataExplorerTab } from "@renderer/features/maps/types/map-data-explorer.types";

const TABS: MapDataExplorerTab[] = ["points", "segments", "links", "trails", "route", "history"];

type MapDataExplorerPageProps = {
  mapId: number;
};

function MapDataExplorerContent({ mapId }: MapDataExplorerPageProps) {
  const { t } = useTranslation();
  useHydrateMapWorkspace(mapId);
  const phase = useMapWorkspacePhase();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const tab = useMapDataExplorerPageStore((state) => state.tab);
  const selection = useMapDataExplorerPageStore((state) => state.selection);
  const setTab = useMapDataExplorerPageStore((state) => state.setTab);
  const reset = useMapDataExplorerPageStore((state) => state.reset);
  const editTarget = useMapDataExplorerPageStore((state) => state.editTarget);
  const setEditTarget = useMapDataExplorerPageStore((state) => state.setEditTarget);
  const statusMessage = useMapDataExplorerPageStore((state) => state.statusMessage);
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const setLinkChain = useMapDataExplorerPageStore((state) => state.setLinkChain);
  const queryClient = useQueryClient();

  useDataExplorerInspectCopyShortcut();
  useDataExplorerInspectViewHotkeys();
  usePersistedNeighborCoveragePreference();
  useMapWorkspaceMenuActions({
    mapId,
    hasSourceFile: false,
    onPreviewGeoJson: () => {},
    onExportGeoJson: () => {},
    onOpenControls: () => {},
    onOpenHistory: () => {},
    onOpenGuide: () => {},
    onHardReload: () => void window.api.invoke("app:hardReload", undefined),
    onSetMapboxGlStyle: () => {},
  });

  const controlPointsQuery = useControlPointsQuery(mapId);
  const mapPointsQuery = useMapPointsQuery(mapId);
  const markerNeighborsQuery = useMarkerNeighborsQuery(mapId);
  const geoSegmentsQuery = useGeoSegmentsQuery(mapId);
  const mapLinksQuery = useMapLinksQuery(mapId);
  const trailsQuery = useTrailsQuery(mapId);
  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  const mapPoints = mapPointsQuery.data?.points ?? [];
  const markerNeighbors = markerNeighborsQuery.data?.neighbors ?? [];
  const geoSegments = geoSegmentsQuery.data?.segments ?? [];
  const mapLinks = mapLinksQuery.data?.links ?? [];
  const trails = trailsQuery.data?.trails ?? [];

  useEffect(() => {
    return () => reset();
  }, [mapId, reset]);

  useMapDataExplorerFocus({
    mapId,
    controlPoints,
    mapPoints,
    geoSegments,
    mapLinks,
    trails,
  });

  const routePlanner = useLinkRoutePlanner({
    mapPoints,
    markerNeighbors,
    onApplyChain: setLinkChain,
    onStatusMessage: setStatusMessage,
    t,
  });

  const showMapPane = tab !== "history";

  const editControlPoint =
    editTarget?.kind === "control-point"
      ? (controlPoints.find((entry) => entry.id === editTarget.id) ?? null)
      : null;
  const editMapPoint =
    editTarget?.kind === "map-point"
      ? (mapPoints.find((entry) => entry.id === editTarget.id) ?? null)
      : null;

  function openEditForSelection() {
    if (!selection) {
      return;
    }
    if (selection.kind === "control-point" || selection.kind === "map-point") {
      setEditTarget({ kind: selection.kind, id: selection.id });
    }
  }

  function handleEditSaved() {
    void queryClient.invalidateQueries({ queryKey: ["controlPoints:list", { mapId }] });
    void queryClient.invalidateQueries({ queryKey: ["mapPoints:list", { mapId }] });
  }

  if (phase === "loading" || phase === "creating") {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-lg loading-spinner text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-test="map-data-explorer-page">
      <MapWorkspaceMenuSyncBridge
        hasSourceFile={false}
        segmentCount={geoSegments.length}
        exportPending={false}
      />
      <header className="drag-region flex shrink-0 items-center gap-3 border-b border-base-content/10 bg-base-100/80 px-3 py-2">
        <Link
          to="/data"
          className="no-drag inline-flex size-8 items-center justify-center rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content"
          aria-label={t("maps.workspace.dataExplorer.backToData")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="no-drag min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">
            {workspace?.name ?? t("maps.workspace.dataExplorer.title")}
          </h1>
          <p className="truncate text-xs text-base-content/50">
            {t("maps.workspace.dataExplorer.pageSubtitle")}
          </p>
        </div>
        <Link
          to="/maps/$mapId"
          params={{ mapId: String(mapId) }}
          className="no-drag btn gap-1.5 btn-ghost btn-sm"
          data-test="open-map-workspace"
        >
          <ExternalLink className="size-3.5" />
          {t("maps.workspace.dataExplorer.openWorkspace")}
        </Link>
      </header>

      <div className="no-drag flex shrink-0 gap-1 overflow-x-auto border-b border-base-content/10 px-3">
        {TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === entry
                ? "bg-base-100 text-primary"
                : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content",
            )}
            onClick={() => setTab(entry)}
            data-test={`data-explorer-tab-${entry}`}
          >
            {t(`maps.workspace.dataExplorer.tabs.${entry}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {showMapPane ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={68} minSize={35}>
              <div className="h-full overflow-y-auto p-4">
                <MapDataExplorerTables
                  mapId={mapId}
                  mapPoints={mapPoints}
                  markerNeighbors={markerNeighbors}
                  geoSegments={geoSegments}
                  mapLinks={mapLinks}
                  trails={trails}
                  routePlanner={routePlanner}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={32} minSize={22}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={58} minSize={30}>
                  <MapDataExplorerMapPanel mapId={mapId} routePlanner={routePlanner} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={42} minSize={20}>
                  <div className="h-full overflow-hidden border-t border-base-content/10 bg-base-200/30">
                    <MapDataExplorerDetailsPanel
                      mapId={mapId}
                      selection={selection}
                      controlPoints={controlPoints}
                      mapPoints={mapPoints}
                      markerNeighbors={markerNeighbors}
                      geoSegments={geoSegments}
                      mapLinks={mapLinks}
                      trails={trails}
                      onEdit={openEditForSelection}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <MapDataExplorerTables
              mapId={mapId}
              mapPoints={mapPoints}
              markerNeighbors={markerNeighbors}
              geoSegments={geoSegments}
              mapLinks={mapLinks}
              trails={trails}
              routePlanner={routePlanner}
            />
          </div>
        )}
      </div>

      <AppStatusToast message={statusMessage} onDismiss={() => setStatusMessage(null)} />

      {editTarget ? (
        <MapDataExplorerEditDialog
          mapId={mapId}
          target={editTarget}
          controlPoint={editControlPoint}
          mapPoint={editMapPoint}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      ) : null}
    </div>
  );
}

export function MapDataExplorerPage({ mapId }: MapDataExplorerPageProps) {
  return (
    <MapWorkspaceProvider>
      <MapDataExplorerContent mapId={mapId} />
    </MapWorkspaceProvider>
  );
}
