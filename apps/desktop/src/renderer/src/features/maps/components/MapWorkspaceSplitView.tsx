import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../../components/common/Resizable";
import { useIpcMutation } from "../../../hooks/useIpc";
import { useControlPointsQuery } from "../hooks/useControlPointsQuery";
import { useTileCacheStatusQuery } from "../hooks/useTileCacheStatusQuery";
import { resolveLocalTileUrl } from "../hooks/tile-cache-api";
import { copyMapCoordinates } from "../lib/copy-map-coordinates";
import { workspaceToPdfTransform, pdfTransformToWorkspacePatch } from "../lib/pdf-view-transform";
import type { MapHandle } from "../lib/map-handle";
import { captureWorkspaceView } from "../lib/rendered-map-view/capture-workspace-view";
import { registerWorkspaceCapture } from "../lib/workspace-capture-registry";
import { useWorkspacePersistence } from "../hooks/useWorkspacePersistence";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "../store/MapWorkspaceProvider";
import { LeafletMapPane } from "./LeafletMapPane";
import { MapTileCacheBoundsModal } from "./MapTileCacheBoundsModal";
import { MapWorkspaceControlsModal } from "./MapWorkspaceControlsModal";
import { MapWorkspaceHeader } from "./MapWorkspaceHeader";
import { SourceDocumentPane } from "./SourceDocumentPane";

export function MapWorkspaceSplitView() {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const sourceFile = useMapWorkspaceState((state) => state.sourceFile);
  const { openControls } = useMapWorkspaceUiActions();
  const { setHomeViewport } = useMapWorkspaceUiActions();
  const { setCursorCoordinates, setSelectedCoordinates, setStatusMessage, setPendingMapPoint } =
    useMapWorkspaceUiActions();
  const homeViewport = useMapWorkspaceUiState((state) => state.homeViewport);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const pendingMapPoint = useMapWorkspaceUiState((state) => state.pendingMapPoint);
  const selectedControlPointId = useMapWorkspaceUiState((state) => state.selectedControlPointId);
  const { queueSave } = useWorkspacePersistence();
  const controlPointsQuery = useControlPointsQuery(workspace?.id ?? null);
  const createControlPoint = useIpcMutation("controlPoints:create");
  const updateControlPoint = useIpcMutation("controlPoints:update");
  const [mapHandle, setMapHandle] = useState<MapHandle | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);
  const controlPointsRef = useRef(controlPointsQuery.data?.controlPoints ?? []);
  const sourceCaptureRef = useRef<{
    getPdfCanvas: () => HTMLCanvasElement | null;
    getSourceViewport: () => HTMLDivElement | null;
  } | null>(null);
  const statusTimerRef = useRef<number | undefined>(undefined);
  const tileCache = useTileCacheStatusQuery(workspace?.id ?? null);
  const localTileUrl = workspace
    ? resolveLocalTileUrl(workspace.id, workspace.baseMapStyle, tileCache.data)
    : null;

  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  controlPointsRef.current = controlPoints;

  const captureOverlays = useMemo(
    () => ({
      controlPoints: controlPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
      geoSegments: [],
      pendingMapPoint: pendingMapPoint,
      pendingTracePoints: [],
      baseMapStyle: workspace?.baseMapStyle ?? ("standard" as const),
    }),
    [controlPoints, pendingMapPoint, workspace?.baseMapStyle],
  );

  useEffect(() => {
    mapHandleRef.current = mapHandle;
  }, [mapHandle]);

  const handleCaptureReady = useCallback(
    (elements: {
      getPdfCanvas: () => HTMLCanvasElement | null;
      getSourceViewport: () => HTMLDivElement | null;
    }) => {
      sourceCaptureRef.current = elements;
    },
    [],
  );

  useEffect(() => {
    if (!workspace) {
      return;
    }

    return registerWorkspaceCapture(workspace.id, async () => {
      const handle = mapHandleRef.current;
      if (!handle) {
        throw new Error("Map pane is not ready yet.");
      }

      const mapPane = await handle.captureView({
        ...captureOverlays,
        pendingMapPoint: pendingMapPoint,
      });

      return captureWorkspaceView({
        mapId: workspace.id,
        pdfCanvas: sourceCaptureRef.current?.getPdfCanvas() ?? null,
        sourceViewport: sourceCaptureRef.current?.getSourceViewport() ?? null,
        pdfTransform: workspaceToPdfTransform(workspace),
        mapPane,
        controlPoints: captureOverlays.controlPoints,
        controlPointsVisible: controlPointsRef.current.length > 0,
      });
    });
  }, [captureOverlays, pendingMapPoint, workspace]);

  useEffect(() => {
    if (!workspace) {
      setHomeViewport(null);
    }
  }, [setHomeViewport, workspace?.id]);

  const handleCenterMap = useCallback(() => {
    if (!mapHandle || !homeViewport) {
      return;
    }

    mapHandle.setViewport(homeViewport);
  }, [homeViewport, mapHandle]);

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

  const handleMapLocationPick = useCallback(
    (latitude: number, longitude: number) => {
      if (!referenceMode) {
        return;
      }

      setPendingMapPoint({ latitude, longitude });
      setStatusMessage(
        t("maps.workspace.referencePendingPdf", {
          value: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        }),
      );
    },
    [referenceMode, setPendingMapPoint, setStatusMessage, t],
  );

  const handlePdfLocationPick = useCallback(
    (imageX: number, imageY: number) => {
      if (!referenceMode || !pendingMapPoint || !workspace) {
        return;
      }

      void createControlPoint
        .mutateAsync({
          mapId: workspace.id,
          imageX,
          imageY,
          longitude: pendingMapPoint.longitude,
          latitude: pendingMapPoint.latitude,
        })
        .then(() => {
          setPendingMapPoint(null);
          setStatusMessage(t("maps.workspace.referenceCreated"));
          window.clearTimeout(statusTimerRef.current);
          statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2500);
        })
        .catch((error) => {
          setStatusMessage(
            error instanceof Error ? error.message : t("maps.workspace.referenceError"),
          );
        });
    },
    [
      createControlPoint,
      pendingMapPoint,
      referenceMode,
      setPendingMapPoint,
      setStatusMessage,
      t,
      workspace,
    ],
  );

  const handleControlPointMapMove = useCallback(
    (controlPointId: number, latitude: number, longitude: number) => {
      if (!workspace) {
        return;
      }

      const point = controlPoints.find((entry) => entry.id === controlPointId);
      if (!point) {
        return;
      }

      void updateControlPoint.mutateAsync({
        mapId: workspace.id,
        controlPointId,
        imageX: point.imageX,
        imageY: point.imageY,
        latitude,
        longitude,
      });
    },
    [controlPoints, updateControlPoint, workspace],
  );

  const handleControlPointPdfMove = useCallback(
    (controlPointId: number, imageX: number, imageY: number) => {
      if (!workspace) {
        return;
      }

      const point = controlPoints.find((entry) => entry.id === controlPointId);
      if (!point) {
        return;
      }

      void updateControlPoint.mutateAsync({
        mapId: workspace.id,
        controlPointId,
        imageX,
        imageY,
        latitude: point.latitude,
        longitude: point.longitude,
      });
    },
    [controlPoints, updateControlPoint, workspace],
  );

  if (!workspace) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MapWorkspaceHeader onOpenControls={openControls} hasSourceFile={Boolean(sourceFile)} />

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
                  controlPoints={controlPoints}
                  selectedControlPointId={selectedControlPointId}
                  referenceMode={referenceMode}
                  canPickPdfPoint={referenceMode && pendingMapPoint !== null}
                  onTransformChange={handlePdfTransformChange}
                  onPdfLocationPick={handlePdfLocationPick}
                  onControlPointPdfMove={handleControlPointPdfMove}
                  onCaptureReady={handleCaptureReady}
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
              <button
                type="button"
                className="btn absolute top-16 left-3 z-[1000] btn-square bg-base-100/90 shadow-sm btn-ghost btn-sm"
                onClick={handleCenterMap}
                disabled={!mapHandle || !homeViewport}
                aria-label={t("maps.workspace.centerMap")}
                title={t("maps.workspace.centerMap")}
              >
                <LocateFixed className="size-4" />
              </button>
              <LeafletMapPane
                workspace={workspace}
                localTileUrl={localTileUrl}
                tileCacheOverlay={tileCache.data?.bounds ?? null}
                controlPoints={controlPoints}
                pendingMapPoint={pendingMapPoint}
                canPickMapPoint={referenceMode && pendingMapPoint === null}
                selectedControlPointId={selectedControlPointId}
                onReady={setMapHandle}
                onInitialViewportReady={setHomeViewport}
                onViewportChange={handleViewportChange}
                onCursorMove={(coordinates) => setCursorCoordinates(coordinates)}
                onCoordinateSelect={(coordinates) => {
                  void handleCoordinateSelect(coordinates);
                }}
                onMapLocationPick={handleMapLocationPick}
                onControlPointMapMove={handleControlPointMapMove}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <MapWorkspaceControlsModal mapHandle={mapHandle} controlPoints={controlPoints} />
      <MapTileCacheBoundsModal />
    </div>
  );
}
