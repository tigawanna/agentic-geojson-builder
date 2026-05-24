import { capturePdfPaneCanvas } from "./capture-pdf-pane";
import type { PdfCaptureControlPoint } from "./capture-pdf-pane";
import type { PdfViewTransform, RenderedMapView, RenderedMapViewMapPane } from "./types";

type CaptureWorkspaceViewInput = {
  mapId: number;
  pdfCanvas: HTMLCanvasElement | null;
  pdfTransform: PdfViewTransform;
  controlPoints: PdfCaptureControlPoint[];
  selectedControlPointId: number | null;
  mapPane: RenderedMapViewMapPane | null;
  controlPointsVisible: boolean;
  overlays: RenderedMapView["overlays"];
};

export function captureWorkspaceView(input: CaptureWorkspaceViewInput): RenderedMapView {
  const pdfPane = input.pdfCanvas
    ? capturePdfPaneCanvas(input.pdfCanvas, input.pdfTransform, {
        controlPoints: input.controlPoints,
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
    overlays: input.overlays,
  };
}
