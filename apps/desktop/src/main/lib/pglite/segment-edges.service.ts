import { and, asc, eq } from "drizzle-orm";
import type { MapPointNodeRole } from "@shared/map-points.types.js";
import type {
  BuildSegmentsFromPathInput,
  BuildSegmentsFromPathPreview,
  BuildSegmentsFromPathResult,
  CreateSegmentEdgeChainFromPointsInput,
  CreateSegmentEdgeChainFromPointsResult,
  CreateSegmentEdgeFromPointsInput,
  CreateSegmentEdgeInput,
  DeleteSegmentEdgeInput,
  SegmentEdgeRecord,
  UpdateSegmentEdgeInput,
} from "@shared/segments.types.js";
import type { GeoSegmentPathKind, GeoSegmentStatus } from "@shared/geo-segments.types.js";
import {
  combineGroupCoordinates,
  pathLengthMeters,
  projectPointFractionOnLine,
  sliceLineBetweenFractions,
} from "@main/lib/geojson/line-fraction.js";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref.js";
import { buildSegmentProposalsFromPath } from "@main/lib/geojson/segmentation.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { geoSegmentTable } from "@main/lib/pglite/schema/geo-segment.schema.js";
import { mapPointTable } from "@main/lib/pglite/schema/map-point.schema.js";
import {
  segmentEdgeTable,
  type SegmentEdgeRow,
} from "@main/lib/pglite/schema/segment-edge.schema.js";

function toRecord(row: SegmentEdgeRow): SegmentEdgeRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    fromRef: row.fromRef,
    toRef: row.toRef,
    pathSlug: row.pathSlug,
    startFraction: row.startFraction,
    endFraction: row.endFraction,
    geometry: row.geometryJson ?? null,
    lengthM: row.lengthM,
    kind: row.kind as GeoSegmentPathKind,
    bidirectional: row.bidirectional,
    status: row.status as GeoSegmentStatus,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type GroupGeometry = {
  pathSlug: string;
  coordinates: [number, number][];
  pathKind: GeoSegmentPathKind;
};

async function loadGroupGeometries(mapId: number): Promise<GroupGeometry[]> {
  const db = getPgliteDb();
  const rows = await db
    .select({
      segmentGroupId: geoSegmentTable.segmentGroupId,
      segmentIndex: geoSegmentTable.segmentIndex,
      pathKind: geoSegmentTable.pathKind,
      geometryJson: geoSegmentTable.geometryJson,
    })
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId));

  const groups = new Map<
    string,
    Array<{
      segmentIndex: number;
      geometry: { coordinates: [number, number][] };
      pathKind: string;
    }>
  >();

  for (const row of rows) {
    const list = groups.get(row.segmentGroupId) ?? [];
    list.push({
      segmentIndex: row.segmentIndex,
      geometry: { coordinates: row.geometryJson.coordinates },
      pathKind: row.pathKind,
    });
    groups.set(row.segmentGroupId, list);
  }

  return [...groups.entries()].map(([pathSlug, segments]) => ({
    pathSlug,
    coordinates: combineGroupCoordinates(segments),
    pathKind: (segments[0]?.pathKind ?? "unknown") as GeoSegmentPathKind,
  }));
}

async function upsertSegmentEdge(input: {
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction: number | null;
  endFraction: number | null;
  geometryJson: SegmentEdgeRow["geometryJson"];
  lengthM: number | null;
  kind: GeoSegmentPathKind;
  bidirectional: boolean;
  status: GeoSegmentStatus;
}): Promise<SegmentEdgeRecord> {
  const db = getPgliteDb();
  const [existing] = await db
    .select()
    .from(segmentEdgeTable)
    .where(
      and(
        eq(segmentEdgeTable.mapId, input.mapId),
        eq(segmentEdgeTable.fromRef, input.fromRef),
        eq(segmentEdgeTable.toRef, input.toRef),
        eq(segmentEdgeTable.pathSlug, input.pathSlug),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(segmentEdgeTable)
      .set({
        startFraction: input.startFraction,
        endFraction: input.endFraction,
        geometryJson: input.geometryJson,
        lengthM: input.lengthM,
        kind: input.kind,
        bidirectional: input.bidirectional,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(segmentEdgeTable.id, existing.id))
      .returning();

    if (!row) {
      throw new Error("Failed to update segment edge.");
    }
    return toRecord(row);
  }

  const [row] = await db
    .insert(segmentEdgeTable)
    .values({
      mapId: input.mapId,
      fromRef: input.fromRef,
      toRef: input.toRef,
      pathSlug: input.pathSlug,
      startFraction: input.startFraction,
      endFraction: input.endFraction,
      geometryJson: input.geometryJson,
      lengthM: input.lengthM,
      kind: input.kind,
      bidirectional: input.bidirectional,
      status: input.status,
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create segment edge.");
  }
  return toRecord(row);
}

export async function listSegmentEdges(mapId: number): Promise<SegmentEdgeRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(segmentEdgeTable)
    .where(eq(segmentEdgeTable.mapId, mapId))
    .orderBy(asc(segmentEdgeTable.pathSlug), asc(segmentEdgeTable.id));

  return rows.map(toRecord);
}

export async function createSegmentEdge(input: CreateSegmentEdgeInput): Promise<SegmentEdgeRecord> {
  const fromRef = input.fromRef.trim();
  const toRef = input.toRef.trim();
  if (!fromRef || !toRef) {
    throw new Error("Both fromRef and toRef are required.");
  }
  if (fromRef === toRef) {
    throw new Error("A segment must connect two different points.");
  }

  const geometry = input.geometry ?? null;
  const lengthM =
    input.lengthM ??
    (geometry && geometry.coordinates.length >= 2 ? pathLengthMeters(geometry.coordinates) : null);

  return upsertSegmentEdge({
    mapId: input.mapId,
    fromRef,
    toRef,
    pathSlug: input.pathSlug.trim(),
    startFraction: input.startFraction ?? null,
    endFraction: input.endFraction ?? null,
    geometryJson: geometry,
    lengthM,
    kind: input.kind ?? "unknown",
    bidirectional: input.bidirectional ?? true,
    status: input.status ?? "draft",
  });
}

export async function createSegmentEdgeFromPoints(
  input: CreateSegmentEdgeFromPointsInput,
): Promise<SegmentEdgeRecord> {
  const db = getPgliteDb();
  const points = await db.select().from(mapPointTable).where(eq(mapPointTable.mapId, input.mapId));

  const fromPoint = points.find((point) => point.id === input.fromPointId);
  const toPoint = points.find((point) => point.id === input.toPointId);

  if (!fromPoint || !toPoint) {
    throw new Error("Both points must exist on this map.");
  }
  const fromRef = resolveMapPointLinkRef({
    id: fromPoint.id,
    ref: fromPoint.ref,
    name: fromPoint.name,
  });
  const toRef = resolveMapPointLinkRef({
    id: toPoint.id,
    ref: toPoint.ref,
    name: toPoint.name,
  });

  const groups = await loadGroupGeometries(input.mapId);

  let chosen: {
    pathSlug: string;
    startFraction: number | null;
    endFraction: number | null;
    pathKind: GeoSegmentPathKind;
    geometry: NonNullable<SegmentEdgeRow["geometryJson"]>;
    lengthM: number;
  } | null = null;

  const candidateGroups = input.pathSlug
    ? groups.filter((group) => group.pathSlug === input.pathSlug)
    : groups;

  let bestScore = Number.POSITIVE_INFINITY;
  for (const group of candidateGroups) {
    const fromProjection = projectPointFractionOnLine(
      fromPoint.location.x,
      fromPoint.location.y,
      group.coordinates,
    );
    const toProjection = projectPointFractionOnLine(
      toPoint.location.x,
      toPoint.location.y,
      group.coordinates,
    );

    if (!fromProjection || !toProjection) {
      continue;
    }

    const score = Math.max(fromProjection.distanceMeters, toProjection.distanceMeters);
    if (score < bestScore) {
      const startFraction = fromProjection.fraction;
      const endFraction = toProjection.fraction;
      const coordinates = sliceLineBetweenFractions(group.coordinates, startFraction, endFraction);
      if (coordinates.length < 2) {
        continue;
      }

      bestScore = score;
      chosen = {
        pathSlug: group.pathSlug,
        startFraction,
        endFraction,
        pathKind: group.pathKind,
        geometry: { type: "LineString", coordinates },
        lengthM: pathLengthMeters(coordinates),
      };
    }
  }

  if (!chosen) {
    const coordinates: [number, number][] = [
      [fromPoint.location.x, fromPoint.location.y],
      [toPoint.location.x, toPoint.location.y],
    ];
    chosen = {
      pathSlug: input.pathSlug?.trim() || "manual-segments",
      startFraction: null,
      endFraction: null,
      pathKind: "unknown",
      geometry: { type: "LineString", coordinates },
      lengthM: pathLengthMeters(coordinates),
    };
  }

  return upsertSegmentEdge({
    mapId: input.mapId,
    fromRef,
    toRef,
    pathSlug: chosen.pathSlug,
    startFraction: chosen.startFraction,
    endFraction: chosen.endFraction,
    geometryJson: chosen.geometry,
    lengthM: chosen.lengthM,
    kind: chosen.pathKind,
    bidirectional: input.bidirectional ?? true,
    status: "draft",
  });
}

export async function createSegmentEdgeChainFromPoints(
  input: CreateSegmentEdgeChainFromPointsInput,
): Promise<CreateSegmentEdgeChainFromPointsResult> {
  if (input.pointIds.length < 2) {
    throw new Error("Add at least two markers to the chain.");
  }

  const segments: SegmentEdgeRecord[] = [];
  for (let index = 0; index < input.pointIds.length - 1; index += 1) {
    const fromPointId = input.pointIds[index];
    const toPointId = input.pointIds[index + 1];
    if (fromPointId === undefined || toPointId === undefined) {
      continue;
    }
    const segment = await createSegmentEdgeFromPoints({
      mapId: input.mapId,
      fromPointId,
      toPointId,
      pathSlug: input.pathSlug,
      bidirectional: input.bidirectional,
    });
    segments.push(segment);
  }

  return { segments };
}

export async function updateSegmentEdge(input: UpdateSegmentEdgeInput): Promise<SegmentEdgeRecord> {
  const db = getPgliteDb();
  const patch: Partial<typeof segmentEdgeTable.$inferInsert> = { updatedAt: new Date() };

  if (input.pathSlug !== undefined) {
    patch.pathSlug = input.pathSlug.trim();
  }
  if (input.startFraction !== undefined) {
    patch.startFraction = input.startFraction;
  }
  if (input.endFraction !== undefined) {
    patch.endFraction = input.endFraction;
  }
  if (input.geometry !== undefined) {
    patch.geometryJson = input.geometry;
    if (input.lengthM === undefined && input.geometry && input.geometry.coordinates.length >= 2) {
      patch.lengthM = pathLengthMeters(input.geometry.coordinates);
    }
  }
  if (input.lengthM !== undefined) {
    patch.lengthM = input.lengthM;
  }
  if (input.kind !== undefined) {
    patch.kind = input.kind;
  }
  if (input.bidirectional !== undefined) {
    patch.bidirectional = input.bidirectional;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata ?? {};
  }

  const [row] = await db
    .update(segmentEdgeTable)
    .set(patch)
    .where(and(eq(segmentEdgeTable.id, input.segmentId), eq(segmentEdgeTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Segment not found.");
  }

  return toRecord(row);
}

export async function deleteSegmentEdge(input: DeleteSegmentEdgeInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(segmentEdgeTable)
    .where(and(eq(segmentEdgeTable.id, input.segmentId), eq(segmentEdgeTable.mapId, input.mapId)));

  return { ok: true };
}

export async function previewBuildSegmentsFromPath(
  input: BuildSegmentsFromPathInput,
): Promise<BuildSegmentsFromPathPreview> {
  const groups = await loadGroupGeometries(input.mapId);
  const group = groups.find((item) => item.pathSlug === input.pathSlug);
  if (!group || group.coordinates.length < 2) {
    throw new Error(`No drawn path found for "${input.pathSlug}".`);
  }

  const db = getPgliteDb();
  const points = await db.select().from(mapPointTable).where(eq(mapPointTable.mapId, input.mapId));

  const { proposed, skipped } = buildSegmentProposalsFromPath(
    group.coordinates,
    points.map((point) => ({
      ref: point.ref ?? "",
      longitude: point.location.x,
      latitude: point.location.y,
      nodeRole: point.nodeRole as MapPointNodeRole | null,
      category: point.category,
    })),
    { maxProjectionDistanceMeters: input.maxProjectionDistanceMeters },
  );

  return {
    pathSlug: input.pathSlug,
    proposed,
    skippedMarkers: skipped,
  };
}

export async function buildSegmentsFromPath(
  input: BuildSegmentsFromPathInput,
): Promise<BuildSegmentsFromPathResult> {
  const preview = await previewBuildSegmentsFromPath(input);
  const groups = await loadGroupGeometries(input.mapId);
  const group = groups.find((item) => item.pathSlug === input.pathSlug);
  const pathKind = group?.pathKind ?? "unknown";

  const db = getPgliteDb();
  let deletedCount = 0;

  if (input.replaceExisting) {
    const deleted = await db
      .delete(segmentEdgeTable)
      .where(
        and(eq(segmentEdgeTable.mapId, input.mapId), eq(segmentEdgeTable.pathSlug, input.pathSlug)),
      )
      .returning({ id: segmentEdgeTable.id });
    deletedCount = deleted.length;
  }

  const created: SegmentEdgeRecord[] = [];

  for (const proposal of preview.proposed) {
    const record = await upsertSegmentEdge({
      mapId: input.mapId,
      fromRef: proposal.fromRef,
      toRef: proposal.toRef,
      pathSlug: input.pathSlug,
      startFraction: proposal.startFraction,
      endFraction: proposal.endFraction,
      geometryJson: proposal.geometry,
      lengthM: proposal.lengthM,
      kind: pathKind,
      bidirectional: true,
      status: "draft",
    });
    created.push(record);
  }

  return {
    pathSlug: input.pathSlug,
    created,
    deletedCount,
  };
}
