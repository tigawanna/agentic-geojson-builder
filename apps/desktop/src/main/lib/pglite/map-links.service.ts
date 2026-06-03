import { and, asc, eq } from "drizzle-orm";
import type {
  CreateMapLinkFromPointsInput,
  CreateMapLinkInput,
  DeleteMapLinkInput,
  MapLinkRecord,
  UpdateMapLinkInput,
} from "@shared/map-links.types.js";
import {
  combineGroupCoordinates,
  projectPointFractionOnLine,
} from "@main/lib/geojson/line-fraction.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { geoSegmentTable } from "@main/lib/pglite/schema/geo-segment.schema.js";
import { mapLinkTable, type MapLinkRow } from "@main/lib/pglite/schema/map-link.schema.js";
import { mapPointTable } from "@main/lib/pglite/schema/map-point.schema.js";

function toRecord(row: MapLinkRow): MapLinkRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    fromRef: row.fromRef,
    toRef: row.toRef,
    pathSlug: row.pathSlug,
    startFraction: row.startFraction,
    endFraction: row.endFraction,
    bidirectional: row.bidirectional,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type GroupGeometry = {
  pathSlug: string;
  coordinates: [number, number][];
};

async function loadGroupGeometries(mapId: number): Promise<GroupGeometry[]> {
  const db = getPgliteDb();
  const rows = await db
    .select({
      segmentGroupId: geoSegmentTable.segmentGroupId,
      segmentIndex: geoSegmentTable.segmentIndex,
      geometryJson: geoSegmentTable.geometryJson,
    })
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId));

  const groups = new Map<
    string,
    Array<{ segmentIndex: number; geometry: { coordinates: [number, number][] } }>
  >();

  for (const row of rows) {
    const list = groups.get(row.segmentGroupId) ?? [];
    list.push({
      segmentIndex: row.segmentIndex,
      geometry: { coordinates: row.geometryJson.coordinates },
    });
    groups.set(row.segmentGroupId, list);
  }

  return [...groups.entries()].map(([pathSlug, segments]) => ({
    pathSlug,
    coordinates: combineGroupCoordinates(segments),
  }));
}

async function upsertLink(input: {
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction: number | null;
  endFraction: number | null;
  bidirectional: boolean;
}): Promise<MapLinkRecord> {
  const db = getPgliteDb();
  const [existing] = await db
    .select()
    .from(mapLinkTable)
    .where(
      and(
        eq(mapLinkTable.mapId, input.mapId),
        eq(mapLinkTable.fromRef, input.fromRef),
        eq(mapLinkTable.toRef, input.toRef),
        eq(mapLinkTable.pathSlug, input.pathSlug),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(mapLinkTable)
      .set({
        startFraction: input.startFraction,
        endFraction: input.endFraction,
        bidirectional: input.bidirectional,
        updatedAt: new Date(),
      })
      .where(eq(mapLinkTable.id, existing.id))
      .returning();

    if (!row) {
      throw new Error("Failed to update link.");
    }
    return toRecord(row);
  }

  const [row] = await db
    .insert(mapLinkTable)
    .values({
      mapId: input.mapId,
      fromRef: input.fromRef,
      toRef: input.toRef,
      pathSlug: input.pathSlug,
      startFraction: input.startFraction,
      endFraction: input.endFraction,
      bidirectional: input.bidirectional,
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create link.");
  }
  return toRecord(row);
}

export async function listMapLinks(mapId: number): Promise<MapLinkRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(mapLinkTable)
    .where(eq(mapLinkTable.mapId, mapId))
    .orderBy(asc(mapLinkTable.pathSlug), asc(mapLinkTable.id));

  return rows.map(toRecord);
}

export async function createMapLink(input: CreateMapLinkInput): Promise<MapLinkRecord> {
  const fromRef = input.fromRef.trim();
  const toRef = input.toRef.trim();
  if (!fromRef || !toRef) {
    throw new Error("Both fromRef and toRef are required.");
  }
  if (fromRef === toRef) {
    throw new Error("A link must connect two different points.");
  }

  return upsertLink({
    mapId: input.mapId,
    fromRef,
    toRef,
    pathSlug: input.pathSlug.trim(),
    startFraction: input.startFraction ?? null,
    endFraction: input.endFraction ?? null,
    bidirectional: input.bidirectional ?? true,
  });
}

export async function createMapLinkFromPoints(
  input: CreateMapLinkFromPointsInput,
): Promise<MapLinkRecord> {
  const db = getPgliteDb();
  const points = await db.select().from(mapPointTable).where(eq(mapPointTable.mapId, input.mapId));

  const fromPoint = points.find((point) => point.id === input.fromPointId);
  const toPoint = points.find((point) => point.id === input.toPointId);

  if (!fromPoint || !toPoint) {
    throw new Error("Both points must exist on this map.");
  }
  if (!fromPoint.ref || !toPoint.ref) {
    throw new Error("Both points need a ref before they can be linked.");
  }

  const groups = await loadGroupGeometries(input.mapId);
  if (groups.length === 0) {
    throw new Error("No trail paths exist yet. Trace a path before linking points.");
  }

  let chosen: { pathSlug: string; startFraction: number; endFraction: number } | null = null;
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
      bestScore = score;
      chosen = {
        pathSlug: group.pathSlug,
        startFraction: fromProjection.fraction,
        endFraction: toProjection.fraction,
      };
    }
  }

  if (!chosen) {
    throw new Error("Could not project the points onto a path.");
  }

  return upsertLink({
    mapId: input.mapId,
    fromRef: fromPoint.ref,
    toRef: toPoint.ref,
    pathSlug: chosen.pathSlug,
    startFraction: chosen.startFraction,
    endFraction: chosen.endFraction,
    bidirectional: input.bidirectional ?? true,
  });
}

export async function updateMapLink(input: UpdateMapLinkInput): Promise<MapLinkRecord> {
  const db = getPgliteDb();
  const patch: Partial<typeof mapLinkTable.$inferInsert> = { updatedAt: new Date() };

  if (input.pathSlug !== undefined) {
    patch.pathSlug = input.pathSlug.trim();
  }
  if (input.startFraction !== undefined) {
    patch.startFraction = input.startFraction;
  }
  if (input.endFraction !== undefined) {
    patch.endFraction = input.endFraction;
  }
  if (input.bidirectional !== undefined) {
    patch.bidirectional = input.bidirectional;
  }

  const [row] = await db
    .update(mapLinkTable)
    .set(patch)
    .where(and(eq(mapLinkTable.id, input.linkId), eq(mapLinkTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Link not found.");
  }

  return toRecord(row);
}

export async function deleteMapLink(input: DeleteMapLinkInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(mapLinkTable)
    .where(and(eq(mapLinkTable.id, input.linkId), eq(mapLinkTable.mapId, input.mapId)));

  return { ok: true };
}
