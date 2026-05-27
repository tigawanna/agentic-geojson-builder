import type {
  CreateControlPointFromViewportPixelsInput,
  ImagePixelResult,
  LonLatResult,
  MapPanePixelInput,
  PdfPanePixelInput,
} from "../../../shared/control-points.types.js";
import {
  mapPanePixelToLonLat,
  pdfPanePixelToImageXY,
} from "../../../shared/viewport-coordinates.js";
import { createControlPoint } from "../pglite/control-points.service.js";
import {
  getRenderedMapView,
  getStoredRenderedMapView,
} from "../workspace-snapshot/workspace-snapshot.service.js";

async function resolveSnapshot(mapId: number, liveCapture?: boolean) {
  if (liveCapture ?? true) {
    const live = await getRenderedMapView(mapId, { liveCapture: true });
    if (live.snapshot) {
      return live.snapshot;
    }
  }

  const stored = getStoredRenderedMapView(mapId);
  if (!stored.snapshot) {
    throw new Error(
      "No workspace snapshot is available. Open the map workspace and capture the view first.",
    );
  }

  return stored.snapshot;
}

export async function convertMapPanePixel(input: MapPanePixelInput): Promise<LonLatResult> {
  const snapshot = await resolveSnapshot(input.mapId, input.liveCapture);
  if (!snapshot.mapPane) {
    throw new Error("The latest snapshot does not include a map pane image.");
  }

  return mapPanePixelToLonLat(snapshot.mapPane, input.x, input.y);
}

export async function convertPdfPanePixel(input: PdfPanePixelInput): Promise<ImagePixelResult> {
  const snapshot = await resolveSnapshot(input.mapId, input.liveCapture);
  if (!snapshot.pdfPane) {
    throw new Error("The latest snapshot does not include a PDF pane image.");
  }

  return pdfPanePixelToImageXY(snapshot.pdfPane, input.x, input.y);
}

export async function createControlPointFromViewportPixels(
  input: CreateControlPointFromViewportPixelsInput,
) {
  const snapshot = await resolveSnapshot(input.mapId, input.liveCapture);
  if (!snapshot.mapPane) {
    throw new Error("The latest snapshot does not include a map pane image.");
  }
  if (!snapshot.pdfPane) {
    throw new Error("The latest snapshot does not include a PDF pane image.");
  }

  const { longitude, latitude } = mapPanePixelToLonLat(
    snapshot.mapPane,
    input.mapPaneX,
    input.mapPaneY,
  );
  const { imageX, imageY } = pdfPanePixelToImageXY(
    snapshot.pdfPane,
    input.pdfPaneX,
    input.pdfPaneY,
  );

  const controlPoint = await createControlPoint({
    mapId: input.mapId,
    imageX,
    imageY,
    longitude,
    latitude,
    label: input.label,
  });

  return { controlPoint, converted: { imageX, imageY, longitude, latitude } };
}
