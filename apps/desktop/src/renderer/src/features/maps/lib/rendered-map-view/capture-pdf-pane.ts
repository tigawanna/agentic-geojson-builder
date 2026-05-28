import type { PdfViewTransform, RenderedMapViewPdfPane } from "@shared/rendered-map-view.types";
import { PDF_RENDER_SCALE } from "@renderer/features/maps/lib/pdf-view-transform";
import {
  drawPdfAgentGuides,
  drawPdfControlPointLabel,
} from "@renderer/features/maps/lib/rendered-map-view/capture-agent-guides";

export type PdfCaptureControlPoint = {
  id: number;
  imageX: number;
  imageY: number;
};

type CapturePdfPaneOptions = {
  controlPoints?: PdfCaptureControlPoint[];
  selectedControlPointId?: number | null;
  includeAgentGuides?: boolean;
};

function drawPdfControlPoints(
  context: CanvasRenderingContext2D,
  controlPoints: PdfCaptureControlPoint[],
  selectedControlPointId: number | null | undefined,
) {
  controlPoints.forEach((point, index) => {
    const selected = point.id === selectedControlPointId;
    const radius = selected ? 10 : 8;

    context.fillStyle = selected ? "#2563eb" : "#16a34a";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.imageX, point.imageY, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#ffffff";
    context.font = "bold 10px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), point.imageX, point.imageY);
  });
}

export function capturePdfPaneToCanvas(canvas: HTMLCanvasElement, options?: CapturePdfPaneOptions) {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;

  const context = outputCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a canvas context for PDF capture.");
  }

  context.drawImage(canvas, 0, 0);

  if (options?.includeAgentGuides !== false) {
    drawPdfAgentGuides(context, outputCanvas.width, outputCanvas.height);
  }

  if (options?.controlPoints && options.controlPoints.length > 0) {
    drawPdfControlPoints(context, options.controlPoints, options.selectedControlPointId);
    if (options.includeAgentGuides !== false) {
      options.controlPoints.forEach((point, index) => {
        drawPdfControlPointLabel(context, point.imageX, point.imageY, index);
      });
    }
  }

  return outputCanvas;
}

export function capturePdfPaneCanvas(
  canvas: HTMLCanvasElement,
  transform: PdfViewTransform,
  options?: CapturePdfPaneOptions,
): RenderedMapViewPdfPane {
  const outputCanvas = capturePdfPaneToCanvas(canvas, options);
  const dataUrl = outputCanvas.toDataURL("image/png");
  const imageBase64 = dataUrl.split(",")[1];

  if (!imageBase64) {
    throw new Error("Could not capture the PDF canvas.");
  }

  return {
    imageBase64,
    mimeType: "image/png",
    canvasWidth: outputCanvas.width,
    canvasHeight: outputCanvas.height,
    sourceDocumentWidth: outputCanvas.width,
    sourceDocumentHeight: outputCanvas.height,
    coordinateSpace: "pdf-pixels",
    origin: "top-left",
    pdfRenderScale: PDF_RENDER_SCALE,
    viewTransform: transform,
    note: `Full document capture at scale ${PDF_RENDER_SCALE}; pane pixels match control_point imageX/imageY.`,
  };
}
