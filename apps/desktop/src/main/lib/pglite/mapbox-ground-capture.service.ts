import { asc, desc, eq } from "drizzle-orm";
import type {
  CreateMapboxGroundCaptureInput,
  MapboxCaptureTags,
  MapboxGroundCaptureRecord,
  UpdateMapboxGroundCaptureInput,
} from "@shared/mapbox-capture.types.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  mapboxGroundCaptureTable,
  type MapboxGroundCaptureRow,
} from "@main/lib/pglite/schema/mapbox-ground-capture.schema.js";

function toRecord(row: MapboxGroundCaptureRow): MapboxGroundCaptureRecord {
  return {
    id: row.id,
    title: row.title,
    tags: (row.tags as MapboxCaptureTags) ?? {},
    latitude: row.location.y,
    longitude: row.location.x,
    elevation: row.elevation,
    layerId: row.layerId,
    sourceLayer: row.sourceLayer,
    baseMapStyle: row.baseMapStyle,
    approved: row.approved,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMapboxGroundCaptures(): Promise<MapboxGroundCaptureRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(mapboxGroundCaptureTable)
    .orderBy(desc(mapboxGroundCaptureTable.createdAt), asc(mapboxGroundCaptureTable.id));

  return rows.map(toRecord);
}

export async function createMapboxGroundCapture(
  input: CreateMapboxGroundCaptureInput,
): Promise<MapboxGroundCaptureRecord> {
  const db = getPgliteDb();
  const [row] = await db
    .insert(mapboxGroundCaptureTable)
    .values({
      title: input.title.trim() || "Untitled",
      tags: input.tags ?? {},
      location: { x: input.longitude, y: input.latitude },
      elevation: input.elevation ?? null,
      layerId: input.layerId?.trim() || null,
      sourceLayer: input.sourceLayer?.trim() || null,
      baseMapStyle: input.baseMapStyle?.trim() || null,
      approved: false,
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save capture.");
  }

  return toRecord(row);
}

export async function updateMapboxGroundCapture(
  input: UpdateMapboxGroundCaptureInput,
): Promise<MapboxGroundCaptureRecord> {
  const db = getPgliteDb();
  const patch: Partial<typeof mapboxGroundCaptureTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) {
    patch.title = input.title.trim() || "Untitled";
  }
  if (input.tags !== undefined) {
    patch.tags = input.tags;
  }
  if (input.approved !== undefined) {
    patch.approved = input.approved;
  }

  const [row] = await db
    .update(mapboxGroundCaptureTable)
    .set(patch)
    .where(eq(mapboxGroundCaptureTable.id, input.captureId))
    .returning();

  if (!row) {
    throw new Error("Capture not found.");
  }

  return toRecord(row);
}

export async function deleteMapboxGroundCapture(captureId: number): Promise<void> {
  const db = getPgliteDb();
  await db.delete(mapboxGroundCaptureTable).where(eq(mapboxGroundCaptureTable.id, captureId));
}
