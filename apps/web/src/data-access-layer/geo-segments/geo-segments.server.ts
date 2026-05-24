import "@tanstack/react-start/server-only";

import { pdfPixelToLonLatForUser } from "@/data-access-layer/georeference/georeference.server";
import {
  assertMapBelongsToUser,
  getMapWorkspaceForUser,
} from "@/data-access-layer/maps/maps.server";
import { db } from "@/lib/drizzle/client.server";
import { segmentsToFeatureCollection } from "@/lib/geojson/export-segments";
import {
  geoSegmentTable,
  type GeoSegmentRecord,
  type StoredLineStringGeometry,
} from "@/lib/drizzle/schema/maps/geo-segment.schema";
import { and, asc, eq, max } from "drizzle-orm";
import type {
  ApplyFeaturePatchInput,
  CreateGeoSegmentInput,
  ExportGeoJsonResult,
  GeoSegmentCoordinateSpace,
  GeoSegmentPathKind,
  GeoSegmentStatus,
  GeoSegmentViewModel,
} from "./geo-segments.types";

function assertLineString(geometry: StoredLineStringGeometry) {
  if (geometry.type !== "LineString") {
    throw new Error("Geometry must be a LineString.");
  }
  if (geometry.coordinates.length < 2) {
    throw new Error("LineString must have at least 2 coordinates.");
  }
}

function toViewModel(row: GeoSegmentRecord): GeoSegmentViewModel {
  return {
    id: row.id,
    mapId: row.mapId,
    segmentGroupId: row.segmentGroupId,
    segmentIndex: row.segmentIndex,
    name: row.name,
    pathKind: row.pathKind as GeoSegmentPathKind,
    status: row.status as GeoSegmentStatus,
    coordinateSpace: row.coordinateSpace as GeoSegmentCoordinateSpace,
    geometry: row.geometryJson,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function normalizeGeometryToWgs84(
  userId: string,
  mapId: number,
  geometry: StoredLineStringGeometry,
  coordinateSpace: GeoSegmentCoordinateSpace,
): Promise<StoredLineStringGeometry> {
  assertLineString(geometry);

  if (coordinateSpace === "wgs84") {
    return geometry;
  }

  const coordinates = await Promise.all(
    geometry.coordinates.map(async ([imageX, imageY]) => {
      const converted = await pdfPixelToLonLatForUser(userId, { mapId, imageX, imageY });
      return [converted.longitude, converted.latitude] as [number, number];
    }),
  );

  return {
    type: "LineString",
    coordinates,
  };
}

async function nextSegmentIndex(userId: string, mapId: number, segmentGroupId: string) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db
    .select({ maxIndex: max(geoSegmentTable.segmentIndex) })
    .from(geoSegmentTable)
    .where(
      and(eq(geoSegmentTable.mapId, mapId), eq(geoSegmentTable.segmentGroupId, segmentGroupId)),
    );

  return (row?.maxIndex ?? -1) + 1;
}

export async function listGeoSegmentsForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const rows = await db
    .select()
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId))
    .orderBy(asc(geoSegmentTable.segmentGroupId), asc(geoSegmentTable.segmentIndex));

  return rows.map(toViewModel);
}

export async function createGeoSegmentForUser(userId: string, input: CreateGeoSegmentInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  const coordinateSpace = input.coordinateSpace ?? "wgs84";
  const geometry = await normalizeGeometryToWgs84(
    userId,
    input.mapId,
    input.geometry,
    coordinateSpace,
  );

  const segmentIndex =
    input.segmentIndex ?? (await nextSegmentIndex(userId, input.mapId, input.segmentGroupId));

  const [row] = await db
    .insert(geoSegmentTable)
    .values({
      mapId: input.mapId,
      segmentGroupId: input.segmentGroupId,
      segmentIndex,
      name: input.name ?? null,
      pathKind: input.pathKind ?? "unknown",
      status: input.status ?? "draft",
      coordinateSpace: "wgs84",
      geometryJson: geometry,
      confidence: input.confidence ?? null,
      updatedAt: new Date(),
    })
    .returning();

  return toViewModel(row);
}

export async function deleteGeoSegmentForUser(userId: string, mapId: number, segmentId: number) {
  await assertMapBelongsToUser(userId, mapId);

  await db
    .delete(geoSegmentTable)
    .where(and(eq(geoSegmentTable.id, segmentId), eq(geoSegmentTable.mapId, mapId)));
}

export async function updateGeoSegmentForUser(
  userId: string,
  input: {
    mapId: number;
    segmentId: number;
    segmentGroupId?: string;
    name?: string;
    pathKind?: GeoSegmentPathKind;
    geometry: StoredLineStringGeometry;
  },
) {
  await assertMapBelongsToUser(userId, input.mapId);

  const [existing] = await db
    .select()
    .from(geoSegmentTable)
    .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)));

  if (!existing) {
    throw new Error("Segment not found.");
  }

  const geometry = await normalizeGeometryToWgs84(userId, input.mapId, input.geometry, "wgs84");

  const [row] = await db
    .update(geoSegmentTable)
    .set({
      segmentGroupId: input.segmentGroupId ?? existing.segmentGroupId,
      name: input.name !== undefined ? input.name || null : existing.name,
      pathKind: input.pathKind ?? existing.pathKind,
      geometryJson: geometry,
      coordinateSpace: "wgs84",
      updatedAt: new Date(),
    })
    .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)))
    .returning();

  return toViewModel(row);
}

export async function exportGeoJsonForUser(
  userId: string,
  input: {
    mapId: number;
    segmentGroupId?: string;
    statuses?: GeoSegmentStatus[];
  },
): Promise<ExportGeoJsonResult> {
  await assertMapBelongsToUser(userId, input.mapId);

  const allowedStatuses = input.statuses ?? ["draft", "needs-review", "accepted"];
  let segments = await listGeoSegmentsForUser(userId, input.mapId);
  segments = segments.filter((segment) => allowedStatuses.includes(segment.status));

  if (input.segmentGroupId) {
    segments = segments.filter((segment) => segment.segmentGroupId === input.segmentGroupId);
  }

  const map = await getMapWorkspaceForUser(userId, input.mapId);

  return {
    mapId: input.mapId,
    mapName: map?.name ?? null,
    featureCount: segments.length,
    geojson: segmentsToFeatureCollection(segments),
  };
}

export async function applyFeaturePatchForUser(userId: string, input: ApplyFeaturePatchInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  if (input.op === "delete_segment") {
    if (input.segmentId === undefined) {
      throw new Error("segmentId is required for delete_segment.");
    }
    await deleteGeoSegmentForUser(userId, input.mapId, input.segmentId);
    return { deleted: true as const, segmentId: input.segmentId };
  }

  if (!input.geometry) {
    throw new Error("geometry is required for upsert_segment.");
  }

  const coordinateSpace = input.coordinateSpace ?? "pdf-pixels";
  const geometry = await normalizeGeometryToWgs84(
    userId,
    input.mapId,
    input.geometry,
    coordinateSpace,
  );

  if (input.segmentId !== undefined) {
    const [row] = await db
      .update(geoSegmentTable)
      .set({
        segmentGroupId: input.segmentGroupId,
        segmentIndex: input.segmentIndex,
        name: input.name ?? null,
        pathKind: input.pathKind ?? "unknown",
        status: input.status ?? "draft",
        coordinateSpace: "wgs84",
        geometryJson: geometry,
        confidence: input.confidence ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)))
      .returning();

    if (!row) {
      throw new Error("Segment not found.");
    }

    return { segment: toViewModel(row) };
  }

  const segment = await createGeoSegmentForUser(userId, {
    mapId: input.mapId,
    segmentGroupId: input.segmentGroupId,
    segmentIndex: input.segmentIndex,
    name: input.name,
    pathKind: input.pathKind,
    status: input.status,
    coordinateSpace: "wgs84",
    geometry,
    confidence: input.confidence,
  });

  return { segment };
}
