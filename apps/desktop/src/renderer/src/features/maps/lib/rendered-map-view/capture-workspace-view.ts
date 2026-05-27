import type {
  PdfViewTransform,
  RenderedMapView,
  RenderedMapViewMapPane,
} from "@shared/rendered-map-view.types";
import { capturePdfPaneCanvas, captureSourceViewport } from "./capture-pdf-pane";

type CaptureWorkspaceViewInput = {
  mapId: number;
  pdfCanvas: HTMLCanvasElement | null;
  sourceViewport: HTMLElement | null;
  pdfTransform: PdfViewTransform;
  mapPane: RenderedMapViewMapPane | null;
};

export async function captureWorkspaceView(
  input: CaptureWorkspaceViewInput,
): Promise<RenderedMapView> {
  let pdfPane: RenderedMapView["pdfPane"] = null;

  if (input.sourceViewport) {
    pdfPane = await captureSourceViewport(input.sourceViewport, input.pdfTransform);
  } else if (input.pdfCanvas) {
    pdfPane = capturePdfPaneCanvas(input.pdfCanvas, input.pdfTransform);
  }

  return {
    capturedAt: new Date().toISOString(),
    mapId: input.mapId,
    source: "client",
    pdfPane,
    mapPane: input.mapPane,
    controlPointsVisible: false,
    overlays: {
      pendingMapPin: null,
      draftSegmentsDrawn: false,
    },
  };
}
