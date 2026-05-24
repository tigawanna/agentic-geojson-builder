import "@tanstack/react-start/server-only";

import { listControlPointsForUser } from "@/data-access-layer/control-points/control-points.server";
import { assertMapBelongsToUser } from "@/data-access-layer/maps/maps.server";
import {
  fitAffineTransformRobust,
  lonLatToPdfPixel,
  pdfPixelToLonLat,
  type AffineCoefficients,
} from "@/lib/georeference/affine";
import { db } from "@/lib/drizzle/client.server";
import { georeferenceTable } from "@/lib/drizzle/schema/maps/georeference.schema";
import { eq } from "drizzle-orm";
import type {
  CoordinateConversionResult,
  GeoreferenceNotReadyViewModel,
  GeoreferenceReadyViewModel,
  GeoreferenceViewModel,
  LonLatInput,
  PdfPixelConversionResult,
  PdfPixelInput,
} from "./georeference.types";

type GeoreferenceRecord = typeof georeferenceTable.$inferSelect;

const ROBUST_GEOREFERENCE_METHOD = "affine-robust";

function toReadyViewModel(
  mapId: number,
  row: GeoreferenceRecord,
  fit: {
    inlierIds: number[];
    excludedIds: number[];
    perPointErrors: GeoreferenceReadyViewModel["perPointErrors"];
  },
): GeoreferenceReadyViewModel {
  return {
    mapId,
    ready: true,
    method: ROBUST_GEOREFERENCE_METHOD,
    controlPointCount: row.controlPointCount,
    inlierControlPointCount: fit.inlierIds.length,
    excludedControlPointIds: fit.excludedIds,
    residualErrorMeters: row.residualErrorMeters,
    maxErrorMeters: row.maxErrorMeters,
    computedAt: row.computedAt.toISOString(),
    perPointErrors: fit.perPointErrors,
  };
}

function toNotReadyViewModel(
  mapId: number,
  controlPointCount: number,
  reason: GeoreferenceNotReadyViewModel["reason"],
): GeoreferenceNotReadyViewModel {
  return {
    mapId,
    ready: false,
    controlPointCount,
    reason,
  };
}

async function getStoredCoefficients(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db
    .select()
    .from(georeferenceTable)
    .where(eq(georeferenceTable.mapId, mapId))
    .limit(1);

  return row ?? null;
}

function buildControlPointPairs(
  controlPoints: Awaited<ReturnType<typeof listControlPointsForUser>>,
) {
  return controlPoints.map((point) => ({
    id: point.id,
    imageX: point.imageX,
    imageY: point.imageY,
    longitude: point.longitude,
    latitude: point.latitude,
  }));
}

function computeRobustFit(pairs: ReturnType<typeof buildControlPointPairs>) {
  const fit = fitAffineTransformRobust(pairs);
  return {
    coefficients: fit.coefficients,
    inlierIds: fit.inlierIds,
    excludedIds: fit.excludedIds,
    inlierStats: fit.inlierStats,
    perPointErrors: fit.perPointErrors.map((point) => ({
      controlPointId: point.controlPointId,
      errorMeters: point.errorMeters,
    })),
  };
}

export async function getGeoreferenceForUser(
  userId: string,
  mapId: number,
): Promise<GeoreferenceViewModel> {
  const controlPoints = await listControlPointsForUser(userId, mapId);

  if (controlPoints.length < 3) {
    return toNotReadyViewModel(mapId, controlPoints.length, "insufficient_control_points");
  }

  const stored = await getStoredCoefficients(userId, mapId);
  if (
    !stored ||
    stored.controlPointCount !== controlPoints.length ||
    stored.method !== ROBUST_GEOREFERENCE_METHOD
  ) {
    return computeGeoreferenceForUser(userId, mapId);
  }

  const pairs = buildControlPointPairs(controlPoints);
  const fit = computeRobustFit(pairs);

  return toReadyViewModel(mapId, stored, fit);
}

export async function computeGeoreferenceForUser(
  userId: string,
  mapId: number,
): Promise<GeoreferenceViewModel> {
  await assertMapBelongsToUser(userId, mapId);

  const controlPoints = await listControlPointsForUser(userId, mapId);
  if (controlPoints.length < 3) {
    await db.delete(georeferenceTable).where(eq(georeferenceTable.mapId, mapId));
    return toNotReadyViewModel(mapId, controlPoints.length, "insufficient_control_points");
  }

  const pairs = buildControlPointPairs(controlPoints);

  let fit: ReturnType<typeof computeRobustFit>;
  try {
    fit = computeRobustFit(pairs);
  } catch {
    await db.delete(georeferenceTable).where(eq(georeferenceTable.mapId, mapId));
    return toNotReadyViewModel(mapId, controlPoints.length, "singular_transform");
  }

  const coefficients: AffineCoefficients = fit.coefficients;

  const [row] = await db
    .insert(georeferenceTable)
    .values({
      mapId,
      method: ROBUST_GEOREFERENCE_METHOD,
      coefficients,
      controlPointCount: controlPoints.length,
      residualErrorMeters: fit.inlierStats.rmseMeters,
      maxErrorMeters: fit.inlierStats.maxErrorMeters,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: georeferenceTable.mapId,
      set: {
        method: ROBUST_GEOREFERENCE_METHOD,
        coefficients,
        controlPointCount: controlPoints.length,
        residualErrorMeters: fit.inlierStats.rmseMeters,
        maxErrorMeters: fit.inlierStats.maxErrorMeters,
        computedAt: new Date(),
      },
    })
    .returning();

  return toReadyViewModel(mapId, row, fit);
}

export async function pdfPixelToLonLatForUser(
  userId: string,
  input: PdfPixelInput,
): Promise<CoordinateConversionResult> {
  const stored = await getStoredCoefficients(userId, input.mapId);
  if (!stored) {
    throw new Error("Georeference is not ready for this map.");
  }

  return pdfPixelToLonLat(stored.coefficients, input.imageX, input.imageY);
}

export async function lonLatToPdfPixelForUser(
  userId: string,
  input: LonLatInput,
): Promise<PdfPixelConversionResult> {
  const stored = await getStoredCoefficients(userId, input.mapId);
  if (!stored) {
    throw new Error("Georeference is not ready for this map.");
  }

  return lonLatToPdfPixel(stored.coefficients, input.longitude, input.latitude);
}
