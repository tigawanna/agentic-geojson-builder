import { listControlPoints } from "@main/lib/pglite/control-points.service.js";
import {
  fitAffineTransformRobust,
  pdfPixelToLonLat,
  type AffineCoefficients,
} from "@main/lib/georeference/affine.js";

async function getAffineCoefficients(mapId: number): Promise<AffineCoefficients> {
  const controlPoints = await listControlPoints(mapId);
  if (controlPoints.length < 3) {
    throw new Error("At least 3 control points are required for georeference.");
  }

  const pairs = controlPoints.map((point) => ({
    id: point.id,
    imageX: point.imageX,
    imageY: point.imageY,
    longitude: point.longitude,
    latitude: point.latitude,
  }));

  try {
    return fitAffineTransformRobust(pairs).coefficients;
  } catch {
    throw new Error("Georeference transform is singular for this map.");
  }
}

export async function pdfPixelToLonLatForMap(
  mapId: number,
  imageX: number,
  imageY: number,
): Promise<{ longitude: number; latitude: number }> {
  const coefficients = await getAffineCoefficients(mapId);
  return pdfPixelToLonLat(coefficients, imageX, imageY);
}
