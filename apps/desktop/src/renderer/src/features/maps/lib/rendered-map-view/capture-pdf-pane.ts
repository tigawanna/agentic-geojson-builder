import { toPng } from "html-to-image";
import type { PdfViewTransform, RenderedMapViewPdfPane } from "@shared/rendered-map-view.types";
import { PDF_RENDER_SCALE } from "../pdf-view-transform";

export function capturePdfPaneCanvas(
  canvas: HTMLCanvasElement,
  transform: PdfViewTransform,
): RenderedMapViewPdfPane {
  const dataUrl = canvas.toDataURL("image/png");
  const imageBase64 = dataUrl.split(",")[1];

  if (!imageBase64) {
    throw new Error("Could not capture the PDF canvas.");
  }

  return {
    imageBase64,
    mimeType: "image/png",
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    coordinateSpace: "pdf-pixels",
    origin: "top-left",
    pdfRenderScale: PDF_RENDER_SCALE,
    viewTransform: transform,
    note: `Coordinates match rendered page 1 at scale ${PDF_RENDER_SCALE}; imageX/imageY align with control_point image coordinates.`,
  };
}

export async function captureSourceViewport(
  viewport: HTMLElement,
  transform: PdfViewTransform,
): Promise<RenderedMapViewPdfPane> {
  const width = Math.max(viewport.clientWidth, 1);
  const height = Math.max(viewport.clientHeight, 1);

  const dataUrl = await toPng(viewport, {
    cacheBust: true,
    pixelRatio: 1,
    width,
    height,
    skipAutoScale: true,
  });

  const imageBase64 = dataUrl.split(",")[1];
  if (!imageBase64) {
    throw new Error("Could not capture the source document pane.");
  }

  return {
    imageBase64,
    mimeType: "image/png",
    canvasWidth: width,
    canvasHeight: height,
    coordinateSpace: "pdf-pixels",
    origin: "top-left",
    pdfRenderScale: PDF_RENDER_SCALE,
    viewTransform: transform,
    note: "Viewport capture of the visible source document pane including pan, zoom, and rotation.",
  };
}
