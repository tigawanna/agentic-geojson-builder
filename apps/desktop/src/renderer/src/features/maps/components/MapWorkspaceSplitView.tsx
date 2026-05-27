import { useCallback, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../../components/common/Resizable";
import { useTileCacheStatusQuery } from "../hooks/useTileCacheStatusQuery";
import { resolveLocalTileUrl } from "../hooks/tile-cache-api";
import { copyMapCoordinates } from "../lib/copy-map-coordinates";
import { workspaceToPdfTransform, pdfTransformToWorkspacePatch } from "../lib/pdf-view-transform";
import type { MapHandle } from "../lib/map-handle";
import { useWorkspacePersistence } from "../hooks/useWorkspacePersistence";
import { useMapWorkspaceState, useMapWorkspaceUiActions } from "../store/MapWorkspaceProvider";
import { LeafletMapPane } from "./LeafletMapPane";
import { MapWorkspaceControlsModal } from "./MapWorkspaceControlsModal";
import { MapWorkspaceHeader } from "./MapWorkspaceHeader";
import { SourceDocumentPane } from "./SourceDocumentPane";

export function MapWorkspaceSplitView() {
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const sourceFile = useMapWorkspaceState((state) => state.sourceFile);
  const { openControls } = useMapWorkspaceUiActions();
  const { setCursorCoordinates, setSelectedCoordinates, setStatusMessage } =
    useMapWorkspaceUiActions();
  const { queueSave } = useWorkspacePersistence();
  const [mapHandle, setMapHandle] = useState<MapHandle | null>(null);
  const statusTimerRef = useRef<number | undefined>(undefined);
  const tileCache = useTileCacheStatusQuery(workspace?.id ?? null);
  const localTileUrl = workspace
    ? resolveLocalTileUrl(workspace.id, workspace.baseMapStyle, tileCache.data)
    : null;

  const handleViewportChange = useCallback(
    (viewport: { latitude: number; longitude: number; zoom: number }) => {
      queueSave({
        mapCenterLat: viewport.latitude,
        mapCenterLng: viewport.longitude,
        mapZoom: viewport.zoom,
      });
    },
    [queueSave],
  );

  const handleCoordinateSelect = useCallback(
    async (viewport: { latitude: number; longitude: number; zoom: number }) => {
      setSelectedCoordinates({
        latitude: viewport.latitude,
        longitude: viewport.longitude,
      });
      queueSave({
        mapCenterLat: viewport.latitude,
        mapCenterLng: viewport.longitude,
        mapZoom: viewport.zoom,
      });

      const text = await copyMapCoordinates(viewport.latitude, viewport.longitude);
      setStatusMessage(`Coordinates copied: ${text}`);
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2500);
    },
    [queueSave, setSelectedCoordinates, setStatusMessage],
  );

  const handlePdfTransformChange = useCallback(
    (patch: Parameters<typeof pdfTransformToWorkspacePatch>[0]) => {
      queueSave(pdfTransformToWorkspacePatch(patch));
    },
    [queueSave],
  );

  if (!workspace) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MapWorkspaceHeader onOpenControls={openControls} />

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={25}>
            <section className="relative h-full min-h-0 bg-base-200">
              <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-box bg-base-100/90 px-2 py-1 text-xs font-medium">
                Source document
              </span>
              {sourceFile ? (
                <SourceDocumentPane
                  sourceFile={sourceFile}
                  transform={workspaceToPdfTransform(workspace)}
                  onTransformChange={handlePdfTransformChange}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-base-content/50">
                  No source file found
                </div>
              )}
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={25}>
            <section className="relative h-full min-h-0 bg-base-200">
              <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-box bg-base-100/90 px-2 py-1 text-xs font-medium">
                Base map
              </span>
              <LeafletMapPane
                workspace={workspace}
                localTileUrl={localTileUrl}
                tileCacheOverlay={tileCache.data?.bounds ?? null}
                onReady={setMapHandle}
                onViewportChange={handleViewportChange}
                onCursorMove={(coordinates) => setCursorCoordinates(coordinates)}
                onCoordinateSelect={(coordinates) => {
                  void handleCoordinateSelect(coordinates);
                }}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <MapWorkspaceControlsModal mapHandle={mapHandle} />
    </div>
  );
}
