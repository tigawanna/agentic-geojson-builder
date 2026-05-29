import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { mergeReferenceGeoJsonCollections } from "@repo/isomorphic/reference-geojson";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@renderer/components/common/Resizable";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import { useTileCacheStatusQuery } from "@renderer/features/maps/hooks/useTileCacheStatusQuery";
import { resolveLocalTileUrl } from "@renderer/features/maps/hooks/tile-cache-api";
import { copyMapCoordinates } from "@renderer/features/maps/lib/copy-map-coordinates";
import {
  workspaceToPdfTransform,
  pdfTransformToWorkspacePatch,
  computePdfPanToCenterOnImagePoint,
} from "@renderer/features/maps/lib/pdf-view-transform";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { UpdateControlPointInput } from "@shared/control-points.types";
import type { MapHandle } from "@renderer/features/maps/lib/map-handle";
import { captureWorkspaceView } from "@renderer/features/maps/lib/rendered-map-view/capture-workspace-view";
import { registerViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import { registerWorkspaceCapture } from "@renderer/features/maps/lib/workspace-capture-registry";
import { useWorkspacePersistence } from "@renderer/features/maps/hooks/useWorkspacePersistence";
import { useUndoHistory } from "@renderer/features/maps/hooks/useUndoHistory";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { LeafletMapPane } from "@renderer/features/maps/components/LeafletMapPane";
import { MapTileCacheBoundsModal } from "@renderer/features/maps/components/MapTileCacheBoundsModal";
import { MapTraceTrailBar } from "@renderer/features/maps/components/MapTraceTrailBar";
import { MapWorkspaceControlsModal } from "@renderer/features/maps/components/MapWorkspaceControlsModal";
import { MapWorkspaceHeader } from "@renderer/features/maps/components/MapWorkspaceHeader";
import { MapAuditLogModal } from "@renderer/features/maps/components/MapAuditLogModal";
import { SourceDocumentPane } from "@renderer/features/maps/components/SourceDocumentPane";

export function MapWorkspaceSplitView() {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const sourceFile = useMapWorkspaceState((state) => state.sourceFile);
  const { openControls } = useMapWorkspaceUiActions();
  const { setHomeViewport } = useMapWorkspaceUiActions();
  const {
    setCursorCoordinates,
    setSelectedCoordinates,
    setStatusMessage,
    setPendingMapPoint,
    setSelectedControlPointId,
    setPendingTracePoints,
    setEditingSegmentId,
    setSegmentGroupId,
    setSegmentName,
    setSegmentPathKind,
    setTraceMode,
    stopTraceMode,
  } = useMapWorkspaceUiActions();
  const homeViewport = useMapWorkspaceUiState((state) => state.homeViewport);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const traceMode = useMapWorkspaceUiState((state) => state.traceMode);
  const pendingTracePoints = useMapWorkspaceUiState((state) => state.pendingTracePoints);
  const editingSegmentId = useMapWorkspaceUiState((state) => state.editingSegmentId);
  const segmentGroupId = useMapWorkspaceUiState((state) => state.segmentGroupId);
  const segmentName = useMapWorkspaceUiState((state) => state.segmentName);
  const segmentPathKind = useMapWorkspaceUiState((state) => state.segmentPathKind);
  const showReferenceOverlay = useMapWorkspaceUiState((state) => state.showReferenceOverlay);
  const setShowReferenceOverlay = useMapWorkspaceUiActions().setShowReferenceOverlay;
  const pendingMapPoint = useMapWorkspaceUiState((state) => state.pendingMapPoint);
  const selectedControlPointId = useMapWorkspaceUiState((state) => state.selectedControlPointId);
  const { queueSave } = useWorkspacePersistence();
  const controlPointsQuery = useControlPointsQuery(workspace?.id ?? null);
  const geoSegmentsQuery = useGeoSegmentsQuery(workspace?.id ?? null);
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(workspace?.id ?? null);
  const createControlPoint = useIpcMutation("controlPoints:create");
  const updateControlPoint = useIpcMutation("controlPoints:update");
  const deleteGeoSegment = useIpcMutation("geoSegments:delete");
  const createGeoSegment = useIpcMutation("geoSegments:create");
  const updateGeoSegment = useIpcMutation("geoSegments:update");
  const exportGeoJson = useIpcMutation("geoSegments:exportToFile");

  const undoHistory = useUndoHistory<UpdateControlPointInput>((entry) => {
    void updateControlPoint.mutateAsync(entry);
  });
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [mapHandle, setMapHandle] = useState<MapHandle | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);
  const controlPointsRef = useRef(controlPointsQuery.data?.controlPoints ?? []);
  const sourceCaptureRef = useRef<{
    getPdfCanvas: () => HTMLCanvasElement | null;
    getSourceViewport: () => HTMLDivElement | null;
    getDocumentDimensions: () => { width: number; height: number } | null;
  } | null>(null);
  const statusTimerRef = useRef<number | undefined>(undefined);
  const tileCache = useTileCacheStatusQuery(workspace?.id ?? null);
  const localTileUrl = workspace
    ? resolveLocalTileUrl(workspace.id, workspace.baseMapStyle, tileCache.data)
    : null;

  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  const geoSegments = geoSegmentsQuery.data?.segments ?? [];
  controlPointsRef.current = controlPoints;

  const referenceOverlay = useMemo(() => {
    const layers = referenceGeoJsonQuery.data?.layers ?? [];
    const visibleCollections = layers
      .filter((layer) => layer.visible)
      .map((layer) => layer.collection);
    if (visibleCollections.length === 0) {
      return null;
    }
    return mergeReferenceGeoJsonCollections(visibleCollections);
  }, [referenceGeoJsonQuery.data?.layers]);

  const referenceOverlayFeatureCount = referenceOverlay?.features.length ?? 0;

  const captureOverlays = useMemo(
    () => ({
      controlPoints: controlPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
      geoSegments: geoSegments.map((segment) => ({ geometry: segment.geometry })),
      pendingMapPoint: pendingMapPoint,
      pendingTracePoints,
      baseMapStyle: workspace?.baseMapStyle ?? ("standard" as const),
    }),
    [controlPoints, geoSegments, pendingMapPoint, pendingTracePoints, workspace?.baseMapStyle],
  );

  useEffect(() => {
    mapHandleRef.current = mapHandle;
  }, [mapHandle]);

  const handleCaptureReady = useCallback(
    (elements: {
      getPdfCanvas: () => HTMLCanvasElement | null;
      getSourceViewport: () => HTMLDivElement | null;
      getDocumentDimensions: () => { width: number; height: number } | null;
    }) => {
      sourceCaptureRef.current = elements;
    },
    [],
  );

  const handleFocusControlPoint = useCallback(
    (point: ControlPointRecord) => {
      setSelectedControlPointId(point.id);

      const focusZoom = Math.max(workspace?.mapZoom ?? 13, 16);
      mapHandleRef.current?.setViewport({
        latitude: point.latitude,
        longitude: point.longitude,
        zoom: focusZoom,
      });
      queueSave({
        mapCenterLat: point.latitude,
        mapCenterLng: point.longitude,
        mapZoom: focusZoom,
      });

      const source = sourceCaptureRef.current;
      const documentSize = source?.getDocumentDimensions() ?? null;
      if (!workspace || !documentSize) {
        return;
      }

      const pdfPan = computePdfPanToCenterOnImagePoint({
        imageX: point.imageX,
        imageY: point.imageY,
        documentWidth: documentSize.width,
        documentHeight: documentSize.height,
        scale: workspace.pdfScale,
        rotation: workspace.pdfRotation,
      });
      queueSave(pdfTransformToWorkspacePatch(pdfPan));
    },
    [queueSave, setSelectedControlPointId, workspace],
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

      const mapPane = await handle.captureView(
        {
          ...captureOverlays,
          pendingMapPoint: pendingMapPoint,
        },
        { fitControlPoints: controlPointsRef.current.length > 0 },
      );

      return captureWorkspaceView({
        mapId: workspace.id,
        pdfCanvas: sourceCaptureRef.current?.getPdfCanvas() ?? null,
        pdfControlPoints: controlPoints.map((point) => ({
          id: point.id,
          imageX: point.imageX,
          imageY: point.imageY,
        })),
        selectedControlPointId,
        mapPane,
        controlPointsVisible: controlPointsRef.current.length > 0,
      });
    });
  }, [captureOverlays, controlPoints, pendingMapPoint, selectedControlPointId, workspace]);

  useEffect(() => {
    if (!workspace || !mapHandle) {
      return;
    }

    return registerViewportCommand(workspace.id, (command) => {
      if (command.fitBounds) {
        return mapHandle.fitBounds(command.fitBounds);
      }

      const current = mapHandle.getViewport();
      const viewport = {
        latitude: command.latitude ?? current.latitude,
        longitude: command.longitude ?? current.longitude,
        zoom: command.zoom ?? current.zoom,
      };
      mapHandle.setViewport(viewport);
      return viewport;
    });
  }, [mapHandle, workspace]);

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

  const handleTracePointAdd = useCallback(
    (latitude: number, longitude: number) => {
      setPendingTracePoints((current) => [...current, { latitude, longitude }]);
    },
    [setPendingTracePoints],
  );

  const handlePendingTracePointMove = useCallback(
    (index: number, latitude: number, longitude: number) => {
      setPendingTracePoints((current) =>
        current.map((point, pointIndex) =>
          pointIndex === index ? { latitude, longitude } : point,
        ),
      );
    },
    [setPendingTracePoints],
  );

  const handleUndoTracePoint = useCallback(() => {
    setPendingTracePoints((current) => current.slice(0, -1));
  }, [setPendingTracePoints]);

  const handleFinishTrace = useCallback(() => {
    if (!workspace || pendingTracePoints.length < 2) {
      return;
    }

    const groupId = segmentGroupId.trim() || `trail-${Date.now()}`;
    const geometry = {
      type: "LineString" as const,
      coordinates: pendingTracePoints.map(
        (point) => [point.longitude, point.latitude] as [number, number],
      ),
    };

    if (editingSegmentId !== null) {
      void updateGeoSegment
        .mutateAsync({
          mapId: workspace.id,
          segmentId: editingSegmentId,
          segmentGroupId: groupId,
          name: segmentName.trim() || undefined,
          pathKind: segmentPathKind,
          geometry,
        })
        .then(() => {
          stopTraceMode();
          setStatusMessage(t("maps.workspace.traceSaved"));
        });
      return;
    }

    void createGeoSegment
      .mutateAsync({
        mapId: workspace.id,
        segmentGroupId: groupId,
        name: segmentName.trim() || undefined,
        pathKind: segmentPathKind,
        geometry,
      })
      .then(() => {
        setPendingTracePoints([]);
        setStatusMessage(t("maps.workspace.traceSegmentSaved"));
      });
  }, [
    createGeoSegment,
    editingSegmentId,
    pendingTracePoints,
    segmentGroupId,
    segmentName,
    segmentPathKind,
    setPendingTracePoints,
    setStatusMessage,
    stopTraceMode,
    t,
    updateGeoSegment,
    workspace,
  ]);

  const handleSegmentClick = useCallback(
    (segmentId: number) => {
      if (traceMode) {
        return;
      }
      setSelectedSegmentId((current) => (current === segmentId ? null : segmentId));
    },
    [traceMode],
  );

  const handleEditSelectedSegment = useCallback(() => {
    if (!selectedSegmentId) {
      return;
    }
    const segment = geoSegments.find((s) => s.id === selectedSegmentId);
    if (!segment) {
      return;
    }
    setEditingSegmentId(segment.id);
    setSegmentGroupId(segment.segmentGroupId);
    setSegmentName(segment.name ?? "");
    setSegmentPathKind(segment.pathKind);
    setPendingTracePoints(
      segment.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    );
    setTraceMode(true);
    setSelectedSegmentId(null);
  }, [
    geoSegments,
    selectedSegmentId,
    setEditingSegmentId,
    setSegmentGroupId,
    setSegmentName,
    setSegmentPathKind,
    setPendingTracePoints,
    setTraceMode,
  ]);

  const handleDeleteSelectedSegment = useCallback(() => {
    if (!workspace || !selectedSegmentId) {
      return;
    }
    void deleteGeoSegment
      .mutateAsync({ mapId: workspace.id, segmentId: selectedSegmentId })
      .then(() => {
        setSelectedSegmentId(null);
        setStatusMessage("Segment deleted.");
      });
  }, [deleteGeoSegment, selectedSegmentId, setStatusMessage, workspace]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedSegmentId) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        event.preventDefault();
        handleDeleteSelectedSegment();
      }
      if (event.key === "Escape") {
        setSelectedSegmentId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeleteSelectedSegment, selectedSegmentId]);

  const handleExportGeoJson = useCallback(() => {
    if (!workspace) {
      return;
    }

    void exportGeoJson
      .mutateAsync({ mapId: workspace.id, mergeGroups: true })
      .then((result) => {
        if (result.canceled) {
          return;
        }

        setStatusMessage(
          t("maps.workspace.exportSuccess", { count: result.featureCount, path: result.savedPath }),
        );
      })
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : t("maps.workspace.exportError"));
      });
  }, [exportGeoJson, setStatusMessage, t, workspace]);

  const handleControlPointMapMove = useCallback(
    (controlPointId: number, latitude: number, longitude: number) => {
      if (!workspace) {
        return;
      }

      const point = controlPoints.find((entry) => entry.id === controlPointId);
      if (!point) {
        return;
      }

      const redoPayload: UpdateControlPointInput = {
        mapId: workspace.id,
        controlPointId,
        imageX: point.imageX,
        imageY: point.imageY,
        latitude,
        longitude,
      };

      const undoPayload: UpdateControlPointInput = {
        mapId: workspace.id,
        controlPointId,
        imageX: point.imageX,
        imageY: point.imageY,
        latitude: point.latitude,
        longitude: point.longitude,
      };

      undoHistory.push({
        label: `Move point ${controlPointId}`,
        undo: undoPayload,
        redo: redoPayload,
      });
      void updateControlPoint.mutateAsync(redoPayload);
    },
    [controlPoints, undoHistory, updateControlPoint, workspace],
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

      const redoPayload: UpdateControlPointInput = {
        mapId: workspace.id,
        controlPointId,
        imageX,
        imageY,
        latitude: point.latitude,
        longitude: point.longitude,
      };

      const undoPayload: UpdateControlPointInput = {
        mapId: workspace.id,
        controlPointId,
        imageX: point.imageX,
        imageY: point.imageY,
        latitude: point.latitude,
        longitude: point.longitude,
      };

      undoHistory.push({
        label: `Move PDF point ${controlPointId}`,
        undo: undoPayload,
        redo: redoPayload,
      });
      void updateControlPoint.mutateAsync(redoPayload);
    },
    [controlPoints, undoHistory, updateControlPoint, workspace],
  );

  if (!workspace) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MapWorkspaceHeader
        onOpenControls={openControls}
        onOpenAuditLog={() => setAuditLogOpen(true)}
        hasSourceFile={Boolean(sourceFile)}
        segmentCount={geoSegments.length}
        exportDisabled={exportGeoJson.isPending}
        exportPending={exportGeoJson.isPending}
        onExportGeoJson={handleExportGeoJson}
      />

      {traceMode ? (
        <MapTraceTrailBar
          onFinish={handleFinishTrace}
          onUndo={handleUndoTracePoint}
          finishDisabled={pendingTracePoints.length < 2}
          finishPending={createGeoSegment.isPending || updateGeoSegment.isPending}
        />
      ) : null}

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
                {t(`maps.workspace.baseMap.${workspace.baseMapStyle}`)}
                {showReferenceOverlay && referenceOverlayFeatureCount > 0
                  ? ` · ${referenceOverlayFeatureCount} refs`
                  : ""}
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
                referenceOverlay={referenceOverlay}
                showReferenceOverlay={showReferenceOverlay}
                controlPoints={controlPoints}
                geoSegments={geoSegments}
                pendingMapPoint={pendingMapPoint}
                pendingTracePoints={pendingTracePoints}
                canPickMapPoint={referenceMode && pendingMapPoint === null}
                canPickTracePoint={traceMode}
                editingSegmentId={editingSegmentId}
                selectedControlPointId={selectedControlPointId}
                onReady={setMapHandle}
                onInitialViewportReady={setHomeViewport}
                onViewportChange={handleViewportChange}
                onCursorMove={(coordinates) => setCursorCoordinates(coordinates)}
                onCoordinateSelect={(coordinates) => {
                  void handleCoordinateSelect(coordinates);
                }}
                onMapLocationPick={handleMapLocationPick}
                onTracePointAdd={handleTracePointAdd}
                onPendingTracePointMove={handlePendingTracePointMove}
                onControlPointMapMove={handleControlPointMapMove}
                onSegmentClick={handleSegmentClick}
                selectedSegmentId={selectedSegmentId}
              />
              {selectedSegmentId && !traceMode ? (
                <div className="absolute right-3 bottom-3 z-[1000] flex items-center gap-1 rounded-box bg-base-100/95 px-2 py-1.5 shadow-lg">
                  <span className="mr-1 text-xs text-base-content/70">
                    Segment #{selectedSegmentId}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={handleEditSelectedSegment}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-error"
                    onClick={handleDeleteSelectedSegment}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setSelectedSegmentId(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : null}
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <MapWorkspaceControlsModal
        mapId={workspace.id}
        mapHandle={mapHandle}
        controlPoints={controlPoints}
        geoSegments={geoSegments}
        selectedControlPointId={selectedControlPointId}
        showReferenceOverlay={showReferenceOverlay}
        onShowReferenceOverlayChange={setShowReferenceOverlay}
        onFocusControlPoint={handleFocusControlPoint}
      />
      <MapTileCacheBoundsModal />
      <MapAuditLogModal
        mapId={workspace.id}
        open={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
      />
    </div>
  );
}
