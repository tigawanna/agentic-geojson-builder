import type { RenderedMapViewMapPane, RenderedMapViewPdfPane } from "./rendered-map-view.types.js";

export function mapPanePixelToLonLat(
  mapPane: RenderedMapViewMapPane,
  x: number,
  y: number,
): { longitude: number; latitude: number } {
  const width = Math.max(mapPane.containerWidth, 1);
  const height = Math.max(mapPane.containerHeight, 1);
  const t = x / width;
  const u = y / height;
  const { bounds } = mapPane.viewport;

  return {
    longitude: bounds.west + t * (bounds.east - bounds.west),
    latitude: bounds.north - u * (bounds.north - bounds.south),
  };
}

export function pdfPanePixelToImageXY(
  pdfPane: RenderedMapViewPdfPane,
  x: number,
  y: number,
): { imageX: number; imageY: number } {
  const viewportWidth = Math.max(pdfPane.canvasWidth, 1);
  const viewportHeight = Math.max(pdfPane.canvasHeight, 1);
  const documentWidth = Math.max(pdfPane.sourceDocumentWidth ?? viewportWidth, 1);
  const documentHeight = Math.max(pdfPane.sourceDocumentHeight ?? viewportHeight, 1);
  const { scale, rotation, panX, panY } = pdfPane.viewTransform;

  const centerX = viewportWidth / 2 + panX;
  const centerY = viewportHeight / 2 + panY;
  const relativeX = x - centerX;
  const relativeY = y - centerY;
  const radians = (-rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const unrotatedX = relativeX * cos - relativeY * sin;
  const unrotatedY = relativeX * sin + relativeY * cos;
  const scaledX = unrotatedX / Math.max(scale, 0.0001);
  const scaledY = unrotatedY / Math.max(scale, 0.0001);

  return {
    imageX: scaledX + documentWidth / 2,
    imageY: scaledY + documentHeight / 2,
  };
}
