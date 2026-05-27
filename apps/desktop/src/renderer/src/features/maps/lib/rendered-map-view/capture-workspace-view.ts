import type {
  MapCaptureOverlayInput,
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
  controlPoints: MapCaptureOverlayInput["controlPoints"];
  controlPointsVisible: boolean;
};

function attachSourceDocumentDimensions(
  pdfPane: NonNullable<RenderedMapView["pdfPane"]>,
  pdfCanvas: HTMLCanvasElement | null,
) {
  if (!pdfCanvas) {
    return pdfPane;
  }

  return {
    ...pdfPane,
    sourceDocumentWidth: pdfCanvas.width,
    sourceDocumentHeight: pdfCanvas.height,
  };
}

export async function captureWorkspaceView(
  input: CaptureWorkspaceViewInput,
): Promise<RenderedMapView> {
  let pdfPane: RenderedMapView["pdfPane"] = null;

  if (input.sourceViewport) {
    pdfPane = attachSourceDocumentDimensions(
      await captureSourceViewport(input.sourceViewport, input.pdfTransform),
      input.pdfCanvas,
    );
  } else if (input.pdfCanvas) {
    pdfPane = capturePdfPaneCanvas(input.pdfCanvas, input.pdfTransform);
  }

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
