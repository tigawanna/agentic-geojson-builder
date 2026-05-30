import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useControlPointMove } from "@renderer/features/maps/context/control-point-move-context";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useWorkspacePersistence } from "@renderer/features/maps/hooks/useWorkspacePersistence";
import {
  workspaceToPdfTransform,
  pdfTransformToWorkspacePatch,
} from "@renderer/features/maps/lib/pdf-view-transform";
import { registerWorkspaceCapture } from "@renderer/features/maps/lib/workspace-capture-registry";
import { captureWorkspaceView } from "@renderer/features/maps/lib/rendered-map-view/capture-workspace-view";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { SourceDocumentPane } from "@renderer/features/maps/components/SourceDocumentPane";

type MapWorkspaceSourceDocumentPaneProps = {
  registerCapture?: boolean;
  onControlPointPdfMove?: (controlPointId: number, imageX: number, imageY: number) => void;
  onCaptureReady?: (elements: {
    getPdfCanvas: () => HTMLCanvasElement | null;
    getSourceViewport: () => HTMLDivElement | null;
    getDocumentDimensions: () => { width: number; height: number } | null;
  }) => void;
};

export function MapWorkspaceSourceDocumentPane({
  registerCapture = false,
  onControlPointPdfMove: onControlPointPdfMoveOverride,
  onCaptureReady,
}: MapWorkspaceSourceDocumentPaneProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const sourceFile = useMapWorkspaceState((state) => state.sourceFile);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const controlPointDragEnabled = useMapWorkspaceUiState((state) => state.controlPointDragEnabled);
  const { handleControlPointPdfMove } = useControlPointMove();
  const pendingMapPoint = useMapWorkspaceUiState((state) => state.pendingMapPoint);
  const selectedControlPointId = useMapWorkspaceUiState((state) => state.selectedControlPointId);
  const { setPendingMapPoint, setStatusMessage } = useMapWorkspaceUiActions();
  const { queueSave } = useWorkspacePersistence();
  const controlPointsQuery = useControlPointsQuery(workspace?.id ?? null);
  const createControlPoint = useIpcMutation("controlPoints:create");
  const statusTimerRef = useRef<number | undefined>(undefined);
  const localCaptureRef = useRef<{
    getPdfCanvas: () => HTMLCanvasElement | null;
    getSourceViewport: () => HTMLDivElement | null;
    getDocumentDimensions: () => { width: number; height: number } | null;
  } | null>(null);

  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];

  const handleCaptureReady = useCallback(
    (elements: {
      getPdfCanvas: () => HTMLCanvasElement | null;
      getSourceViewport: () => HTMLDivElement | null;
      getDocumentDimensions: () => { width: number; height: number } | null;
    }) => {
      localCaptureRef.current = elements;
      onCaptureReady?.(elements);
    },
    [onCaptureReady],
  );

  useEffect(() => {
    if (!registerCapture || !workspace) {
      return;
    }

    return registerWorkspaceCapture(workspace.id, async () => {
      const pdfCanvas = localCaptureRef.current?.getPdfCanvas() ?? null;
      if (!pdfCanvas) {
        return {
          capturedAt: new Date().toISOString(),
          mapId: workspace.id,
          source: "client",
          pdfPane: null,
          mapPane: null,
          controlPointsVisible: false,
          overlays: {
            pendingMapPin: null,
            draftSegmentsDrawn: false,
          },
        };
      }

      return captureWorkspaceView({
        mapId: workspace.id,
        pdfCanvas,
        pdfControlPoints: controlPoints.map((point) => ({
          id: point.id,
          imageX: point.imageX,
          imageY: point.imageY,
        })),
        selectedControlPointId,
        mapPane: null,
        controlPointsVisible: controlPoints.length > 0,
      });
    });
  }, [controlPoints, registerCapture, selectedControlPointId, workspace]);

  const handlePdfTransformChange = useCallback(
    (patch: Parameters<typeof pdfTransformToWorkspacePatch>[0]) => {
      queueSave(pdfTransformToWorkspacePatch(patch));
    },
    [queueSave],
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

  const allowControlPointDrag = controlPointDragEnabled && !referenceMode;

  if (!workspace || !sourceFile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-base-content/50">
        No source file found
      </div>
    );
  }

  return (
    <SourceDocumentPane
      sourceFile={sourceFile}
      transform={workspaceToPdfTransform(workspace)}
      controlPoints={controlPoints}
      selectedControlPointId={selectedControlPointId}
      referenceMode={referenceMode}
      canPickPdfPoint={referenceMode && pendingMapPoint !== null}
      onTransformChange={handlePdfTransformChange}
      onPdfLocationPick={handlePdfLocationPick}
      allowControlPointDrag={allowControlPointDrag}
      onControlPointPdfMove={onControlPointPdfMoveOverride ?? handleControlPointPdfMove}
      onCaptureReady={handleCaptureReady}
    />
  );
}
