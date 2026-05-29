import { and, asc, eq, max } from "drizzle-orm";
import type {
  ApplyFeaturePatchInput,
  CreateGeoSegmentInput,
  ExportGeoJsonInput,
  ExportGeoJsonResult,
  FindFeatureGapsInput,
  GeoSegmentCoordinateSpace,
  GeoSegmentPathKind,
  GeoSegmentRecord,
  GeoSegmentStatus,
  MergeFeatureSegmentsInput,
  StoredLineStringGeometry,
  UpdateGeoSegmentInput,
  UpdateGeoSegmentStatusInput,
} from "@shared/geo-segments.types.js";
import {
  mergedGroupsToFeatureCollection,
  segmentsToFeatureCollection,
} from "@main/lib/geojson/export-segments.js";
import { findFeatureGaps } from "@main/lib/geojson/segment-gaps.js";
import { mergeFeatureSegmentGroups } from "@main/lib/geojson/merge-segments.js";
import { pdfPixelToLonLatForMap } from "@main/lib/georeference/georeference.service.js";
import { log } from "@main/lib/logger.js";
import { writeAuditEntry } from "@main/lib/pglite/audit-log.service.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  geoSegmentTable,
  type GeoSegmentRecord as GeoSegmentRow,
} from "@main/lib/pglite/schema/geo-segment.schema.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema.js";

function assertLineString(geometry: StoredLineStringGeometry) {
  if (geometry.type !== "LineString") {
    throw new Error("Geometry must be a LineString.");
  }
  if (geometry.coordinates.length < 2) {
    throw new Error("LineString must have at least 2 coordinates.");
  }
}

function toRecord(row: GeoSegmentRow): GeoSegmentRecord {
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
      const converted = await pdfPixelToLonLatForMap(mapId, imageX, imageY);
      return [converted.longitude, converted.latitude] as [number, number];
    }),
  );

  return {
    type: "LineString",
    coordinates,
  };
}

async function nextSegmentIndex(mapId: number, segmentGroupId: string) {
  const db = getPgliteDb();
  const [row] = await db
    .select({ maxIndex: max(geoSegmentTable.segmentIndex) })
    .from(geoSegmentTable)
    .where(
      and(eq(geoSegmentTable.mapId, mapId), eq(geoSegmentTable.segmentGroupId, segmentGroupId)),
    );

  return (row?.maxIndex ?? -1) + 1;
}

async function getMapName(mapId: number): Promise<string | null> {
  const db = getPgliteDb();
  const [row] = await db
    .select({ name: mapTable.name })
    .from(mapTable)
    .where(eq(mapTable.id, mapId))
    .limit(1);
  return row?.name ?? null;
}

function filterByStatuses(segments: GeoSegmentRecord[], statuses: GeoSegmentStatus[]) {
  return segments.filter((segment) => statuses.includes(segment.status));
}

export async function listGeoSegments(mapId: number): Promise<GeoSegmentRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId))
    .orderBy(asc(geoSegmentTable.segmentGroupId), asc(geoSegmentTable.segmentIndex));

  const segments = rows.map(toRecord);
  log.info({
    action: "geo_segment",
    message: "listed segments",
    mapId,
    segmentCount: segments.length,
    segments: segments.map((segment) => ({
      id: segment.id,
      segmentGroupId: segment.segmentGroupId,
      vertexCount: segment.geometry.coordinates.length,
      status: segment.status,
    })),
  });
  return segments;
}

export async function createGeoSegment(input: CreateGeoSegmentInput): Promise<GeoSegmentRecord> {
  const db = getPgliteDb();
  const coordinateSpace = input.coordinateSpace ?? "wgs84";
  const geometry = await normalizeGeometryToWgs84(input.mapId, input.geometry, coordinateSpace);
  const segmentIndex =
    input.segmentIndex ?? (await nextSegmentIndex(input.mapId, input.segmentGroupId));

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

  if (!row) {
    throw new Error("Failed to create geo segment.");
  }

  const segment = toRecord(row);
  log.info({
    action: "geo_segment",
    message: "created segment",
    mapId: input.mapId,
    segmentId: segment.id,
    segmentGroupId: segment.segmentGroupId,
    vertexCount: segment.geometry.coordinates.length,
    coordinateSpace,
    firstCoord: segment.geometry.coordinates[0],
    lastCoord: segment.geometry.coordinates.at(-1),
  });
  void writeAuditEntry({
    mapId: input.mapId,
    entityType: "geo_segment",
    entityId: segment.id,
    action: "create",
    newValue: segment,
  });
  return segment;
}

export async function updateGeoSegment(input: UpdateGeoSegmentInput): Promise<GeoSegmentRecord> {
  const db = getPgliteDb();
  const geometry = await normalizeGeometryToWgs84(input.mapId, input.geometry, "wgs84");

  const [existing] = await db
    .select()
    .from(geoSegmentTable)
    .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)));

  if (!existing) {
    throw new Error("Segment not found.");
  }

  const oldRecord = toRecord(existing);
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

  if (!row) {
    throw new Error("Segment not found.");
  }

  const updated = toRecord(row);
  void writeAuditEntry({
    mapId: input.mapId,
    entityType: "geo_segment",
    entityId: updated.id,
    action: "update",
    oldValue: oldRecord,
    newValue: updated,
  });
  return updated;
}

export async function deleteGeoSegment(mapId: number, segmentId: number): Promise<{ ok: true }> {
  const db = getPgliteDb();
  const [existing] = await db
    .select()
    .from(geoSegmentTable)
    .where(and(eq(geoSegmentTable.id, segmentId), eq(geoSegmentTable.mapId, mapId)));

  await db
    .delete(geoSegmentTable)
    .where(and(eq(geoSegmentTable.id, segmentId), eq(geoSegmentTable.mapId, mapId)));

  if (existing) {
    void writeAuditEntry({
      mapId,
      entityType: "geo_segment",
      entityId: segmentId,
      action: "delete",
      oldValue: toRecord(existing),
    });
  }

  return { ok: true };
}

export async function updateGeoSegmentStatus(
  input: UpdateGeoSegmentStatusInput,
): Promise<GeoSegmentRecord> {
  const db = getPgliteDb();
  const [row] = await db
    .update(geoSegmentTable)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Segment not found.");
  }

  return toRecord(row);
}

export async function exportGeoJson(input: ExportGeoJsonInput): Promise<ExportGeoJsonResult> {
  const allowedStatuses = input.statuses ?? ["draft", "needs-review", "accepted"];
  let segments = await listGeoSegments(input.mapId);
  segments = filterByStatuses(segments, allowedStatuses);

  if (input.segmentGroupId) {
    segments = segments.filter((segment) => segment.segmentGroupId === input.segmentGroupId);
  }

  const geojson = input.mergeGroups
    ? mergedGroupsToFeatureCollection(segments, {
        segmentGroupId: input.segmentGroupId,
        snapToleranceMeters: input.snapToleranceMeters,
        mapId: input.mapId,
      })
    : segmentsToFeatureCollection(segments);

  return {
    mapId: input.mapId,
    mapName: await getMapName(input.mapId),
    featureCount: geojson.features.length,
    geojson,
  };
}

export async function findFeatureGapsForMap(input: FindFeatureGapsInput) {
  const allowedStatuses = input.statuses ?? ["draft", "needs-review", "accepted"];
  let segments = await listGeoSegments(input.mapId);
  segments = filterByStatuses(segments, allowedStatuses);

  const result = findFeatureGaps(segments, {
    segmentGroupId: input.segmentGroupId,
    snapToleranceMeters: input.snapToleranceMeters,
  });

  return {
    mapId: input.mapId,
    ...result,
  };
}

export async function mergeFeatureSegmentsForMap(input: MergeFeatureSegmentsInput) {
  const allowedStatuses = input.statuses ?? ["draft", "needs-review", "accepted"];
  let segments = await listGeoSegments(input.mapId);
  segments = filterByStatuses(segments, allowedStatuses);

  const result = mergeFeatureSegmentGroups(segments, {
    segmentGroupId: input.segmentGroupId,
    snapToleranceMeters: input.snapToleranceMeters,
  });

  return {
    mapId: input.mapId,
    ...result,
  };
}

export async function applyFeaturePatch(input: ApplyFeaturePatchInput) {
  log.info({
    action: "geo_segment",
    message: "apply feature patch",
    mapId: input.mapId,
    op: input.op,
    segmentGroupId: input.segmentGroupId,
    segmentId: input.segmentId,
    coordinateSpace: input.coordinateSpace,
    vertexCount: input.geometry?.coordinates.length,
  });

  if (input.op === "delete_segment") {
    if (input.segmentId === undefined) {
      throw new Error("segmentId is required for delete_segment.");
    }
    await deleteGeoSegment(input.mapId, input.segmentId);
    log.info({
      action: "geo_segment",
      message: "deleted segment",
      mapId: input.mapId,
      segmentId: input.segmentId,
    });
    return { deleted: true as const, segmentId: input.segmentId };
  }

  if (!input.geometry) {
    throw new Error("geometry is required for upsert_segment.");
  }

  const coordinateSpace = input.coordinateSpace ?? "pdf-pixels";
  const geometry = await normalizeGeometryToWgs84(input.mapId, input.geometry, coordinateSpace);

  if (input.segmentId !== undefined) {
    const db = getPgliteDb();
    const [existing] = await db
      .select()
      .from(geoSegmentTable)
      .where(and(eq(geoSegmentTable.id, input.segmentId), eq(geoSegmentTable.mapId, input.mapId)));

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

    const updated = toRecord(row);
    log.info({
      action: "geo_segment",
      message: "updated segment via patch",
      mapId: input.mapId,
      segmentId: updated.id,
      vertexCount: updated.geometry.coordinates.length,
    });
    void writeAuditEntry({
      mapId: input.mapId,
      entityType: "geo_segment",
      entityId: updated.id,
      action: "update",
      oldValue: existing ? toRecord(existing) : null,
      newValue: updated,
      source: "mcp",
    });
    return { segment: updated };
  }

  const segment = await createGeoSegment({
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
