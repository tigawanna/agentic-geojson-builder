import { PDF_RENDER_SCALE } from "./constants";
import type { PdfViewTransform, RenderedMapViewPdfPane } from "./types";

export type PdfCaptureControlPoint = {
  id: number;
  imageX: number;
  imageY: number;
};

type CapturePdfPaneOptions = {
  controlPoints?: PdfCaptureControlPoint[];
  selectedControlPointId?: number | null;
};

function drawPdfControlPoints(
  context: CanvasRenderingContext2D,
  controlPoints: PdfCaptureControlPoint[],
  selectedControlPointId: number | null | undefined,
) {
  controlPoints.forEach((point, index) => {
    const selected = point.id === selectedControlPointId;
    const radius = selected ? 10 : 8;

    context.fillStyle = selected ? "#2563eb" : "#570df8";
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

export function capturePdfPaneToCanvas(
  canvas: HTMLCanvasElement,
  options?: CapturePdfPaneOptions,
) {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;

  const context = outputCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a canvas context for PDF capture.");
  }

  context.drawImage(canvas, 0, 0);

  if (options?.controlPoints && options.controlPoints.length > 0) {
    drawPdfControlPoints(context, options.controlPoints, options.selectedControlPointId);
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
    coordinateSpace: "pdf-pixels",
    origin: "top-left",
    pdfRenderScale: PDF_RENDER_SCALE,
    viewTransform: transform,
    note: `Coordinates match rendered page 1 at scale ${PDF_RENDER_SCALE}; imageX/imageY align with control_point image coordinates.`,
  };
}

export function capturePdfPanePngBlob(canvas: HTMLCanvasElement, options?: CapturePdfPaneOptions) {
  const outputCanvas = capturePdfPaneToCanvas(canvas, options);

  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not export PDF screenshot."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
