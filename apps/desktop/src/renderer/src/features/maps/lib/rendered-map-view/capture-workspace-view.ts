import type {
  PdfViewTransform,
  RenderedMapView,
  RenderedMapViewMapPane,
} from "@shared/rendered-map-view.types";
import {
  capturePdfPaneCanvas,
  type PdfCaptureControlPoint,
} from "@renderer/features/maps/lib/rendered-map-view/capture-pdf-pane";

type CaptureWorkspaceViewInput = {
  mapId: number;
  pdfCanvas: HTMLCanvasElement | null;
  pdfControlPoints: PdfCaptureControlPoint[];
  selectedControlPointId: number | null;
  mapPane: RenderedMapViewMapPane | null;
  controlPointsVisible: boolean;
};

export async function captureWorkspaceView(
  input: CaptureWorkspaceViewInput,
): Promise<RenderedMapView> {
  const identityTransform: PdfViewTransform = {
    scale: 1,
    rotation: 0,
    panX: 0,
    panY: 0,
  };

  const pdfPane = input.pdfCanvas
    ? capturePdfPaneCanvas(input.pdfCanvas, identityTransform, {
        controlPoints: input.pdfControlPoints,
        selectedControlPointId: input.selectedControlPointId,
      })
    : null;

  return {
    capturedAt: new Date().toISOString(),
    mapId: input.mapId,
    source: "client",
    pdfPane,
    mapPane: input.mapPane,
    controlPointsVisible: input.controlPointsVisible,
    overlays: {
      pendingMapPin: null,
      draftSegmentsDrawn: false,
    },
  };
}
