import "@tanstack/react-start/server-only";

import { listControlPointsForUser } from "@/data-access-layer/control-points/control-points.server";
import { assertMapBelongsToUser } from "@/data-access-layer/maps/maps.server";
import {
  computeResidualStats,
  fitAffineTransform,
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

function toReadyViewModel(
  mapId: number,
  row: GeoreferenceRecord,
  perPointErrors: GeoreferenceReadyViewModel["perPointErrors"],
): GeoreferenceReadyViewModel {
  return {
    mapId,
    ready: true,
    method: "affine",
    controlPointCount: row.controlPointCount,
    residualErrorMeters: row.residualErrorMeters,
    maxErrorMeters: row.maxErrorMeters,
    computedAt: row.computedAt.toISOString(),
    perPointErrors,
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

export async function getGeoreferenceForUser(
  userId: string,
  mapId: number,
): Promise<GeoreferenceViewModel> {
  const controlPoints = await listControlPointsForUser(userId, mapId);

  if (controlPoints.length < 3) {
    return toNotReadyViewModel(mapId, controlPoints.length, "insufficient_control_points");
  }

  const stored = await getStoredCoefficients(userId, mapId);
  if (!stored || stored.controlPointCount !== controlPoints.length) {
    return computeGeoreferenceForUser(userId, mapId);
  }

  const pairs = controlPoints.map((point) => ({
    id: point.id,
    imageX: point.imageX,
    imageY: point.imageY,
    longitude: point.longitude,
    latitude: point.latitude,
  }));

  const residuals = computeResidualStats(
    pairs.map(({ id: _id, ...pair }) => pair),
    stored.coefficients,
  );

  return toReadyViewModel(
    mapId,
    stored,
    pairs.map((point, index) => ({
      controlPointId: point.id,
      errorMeters: residuals.perPointErrorsMeters[index] ?? 0,
    })),
  );
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

  const pairs = controlPoints.map((point) => ({
    id: point.id,
    imageX: point.imageX,
    imageY: point.imageY,
    longitude: point.longitude,
    latitude: point.latitude,
  }));

  let coefficients: AffineCoefficients;
  try {
    coefficients = fitAffineTransform(pairs.map(({ id: _id, ...pair }) => pair));
  } catch {
    await db.delete(georeferenceTable).where(eq(georeferenceTable.mapId, mapId));
    return toNotReadyViewModel(mapId, controlPoints.length, "singular_transform");
  }

  const residuals = computeResidualStats(
    pairs.map(({ id: _id, ...pair }) => pair),
    coefficients,
  );

  const [row] = await db
    .insert(georeferenceTable)
    .values({
      mapId,
      method: "affine",
      coefficients,
      controlPointCount: controlPoints.length,
      residualErrorMeters: residuals.rmseMeters,
      maxErrorMeters: residuals.maxErrorMeters,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: georeferenceTable.mapId,
      set: {
        method: "affine",
        coefficients,
        controlPointCount: controlPoints.length,
        residualErrorMeters: residuals.rmseMeters,
        maxErrorMeters: residuals.maxErrorMeters,
        computedAt: new Date(),
      },
    })
    .returning();

  return toReadyViewModel(
    mapId,
    row,
    pairs.map((point, index) => ({
      controlPointId: point.id,
      errorMeters: residuals.perPointErrorsMeters[index] ?? 0,
    })),
  );
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
