import { and, asc, eq, inArray } from "drizzle-orm";
import {
  MAP_POINT_NEIGHBOR_METADATA_KEYS,
  resolveMapPointLinkRef,
} from "@shared/map-point-link-ref.js";
import type {
  MarkerNeighborRecord,
  ReplaceMarkerNeighborsInput,
} from "@shared/marker-neighbors.types.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { mapPointTable } from "@main/lib/pglite/schema/map-point.schema.js";
import {
  markerNeighborTable,
  type MarkerNeighborRow,
} from "@main/lib/pglite/schema/marker-neighbor.schema.js";

const migratedMapIds = new Set<number>();

function toRecord(row: MarkerNeighborRow): MarkerNeighborRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    fromMarkerId: row.fromMarkerId,
    toMarkerId: row.toMarkerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeRef(value: string): string {
  return value.trim().toLowerCase();
}

async function insertEdge(mapId: number, fromMarkerId: number, toMarkerId: number): Promise<void> {
  const db = getPgliteDb();
  const [existing] = await db
    .select({ id: markerNeighborTable.id })
    .from(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, mapId),
        eq(markerNeighborTable.fromMarkerId, fromMarkerId),
        eq(markerNeighborTable.toMarkerId, toMarkerId),
      ),
    )
    .limit(1);
  if (existing) {
    return;
  }
  await db.insert(markerNeighborTable).values({
    mapId,
    fromMarkerId,
    toMarkerId,
    updatedAt: new Date(),
  });
}

async function deleteEdge(mapId: number, fromMarkerId: number, toMarkerId: number): Promise<void> {
  const db = getPgliteDb();
  await db
    .delete(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, mapId),
        eq(markerNeighborTable.fromMarkerId, fromMarkerId),
        eq(markerNeighborTable.toMarkerId, toMarkerId),
      ),
    );
}

async function migrateMetadataNeighbors(mapId: number): Promise<void> {
  if (migratedMapIds.has(mapId)) {
    return;
  }
  migratedMapIds.add(mapId);

  const db = getPgliteDb();
  const points = await db.select().from(mapPointTable).where(eq(mapPointTable.mapId, mapId));

  const refIndex = new Map<string, number>();
  for (const point of points) {
    refIndex.set(
      normalizeRef(
        resolveMapPointLinkRef({
          id: point.id,
          ref: point.ref,
          name: point.name,
        }),
      ),
      point.id,
    );
  }

  const metadataKeys = [
    MAP_POINT_NEIGHBOR_METADATA_KEYS.left,
    MAP_POINT_NEIGHBOR_METADATA_KEYS.right,
    MAP_POINT_NEIGHBOR_METADATA_KEYS.ahead,
  ];

  for (const point of points) {
    const metadata = (point.metadata as Record<string, string> | null) ?? {};
    const linkedIds = new Set<number>();
    for (const key of metadataKeys) {
      const hintRef = metadata[key]?.trim();
      if (!hintRef) {
        continue;
      }
      const toMarkerId = refIndex.get(normalizeRef(hintRef));
      if (!toMarkerId || toMarkerId === point.id) {
        continue;
      }
      linkedIds.add(toMarkerId);
    }
    for (const toMarkerId of linkedIds) {
      await insertEdge(mapId, point.id, toMarkerId);
      await insertEdge(mapId, toMarkerId, point.id);
    }
  }
}

export async function listMarkerNeighbors(mapId: number): Promise<MarkerNeighborRecord[]> {
  await migrateMetadataNeighbors(mapId);

  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(markerNeighborTable)
    .where(eq(markerNeighborTable.mapId, mapId))
    .orderBy(asc(markerNeighborTable.fromMarkerId), asc(markerNeighborTable.toMarkerId));

  return rows.map(toRecord);
}

export async function replaceMarkerNeighbors(
  input: ReplaceMarkerNeighborsInput,
): Promise<MarkerNeighborRecord[]> {
  const db = getPgliteDb();
  const anchorId = input.fromMarkerId;
  const nextIds = new Set(input.toMarkerIds.filter((markerId) => markerId !== anchorId));

  const pointIds = [anchorId, ...nextIds];
  const validPoints = await db
    .select({ id: mapPointTable.id })
    .from(mapPointTable)
    .where(and(eq(mapPointTable.mapId, input.mapId), inArray(mapPointTable.id, pointIds)));

  if (validPoints.length !== pointIds.length) {
    throw new Error("All neighbors must belong to this map.");
  }

  const currentRows = await db
    .select()
    .from(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, input.mapId),
        eq(markerNeighborTable.fromMarkerId, anchorId),
      ),
    );

  const currentIds = new Set(currentRows.map((row) => row.toMarkerId));

  for (const toMarkerId of currentIds) {
    if (!nextIds.has(toMarkerId)) {
      await deleteEdge(input.mapId, anchorId, toMarkerId);
      await deleteEdge(input.mapId, toMarkerId, anchorId);
    }
  }

  for (const toMarkerId of nextIds) {
    if (!currentIds.has(toMarkerId)) {
      await insertEdge(input.mapId, anchorId, toMarkerId);
      await insertEdge(input.mapId, toMarkerId, anchorId);
    }
  }

  const rows = await db
    .select()
    .from(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, input.mapId),
        eq(markerNeighborTable.fromMarkerId, anchorId),
      ),
    )
    .orderBy(asc(markerNeighborTable.toMarkerId));

  return rows.map(toRecord);
}
