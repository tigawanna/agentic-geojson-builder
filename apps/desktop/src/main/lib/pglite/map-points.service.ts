import { and, asc, eq, ne } from "drizzle-orm";
import type {
  CreateMapPointInput,
  DeleteMapPointInput,
  MapPointCategory,
  MapPointElevationSource,
  MapPointNodeRole,
  MapPointRecord,
  UpdateMapPointInput,
} from "@shared/map-points.types.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { mapPointTable, type MapPointRow } from "@main/lib/pglite/schema/map-point.schema.js";

function toRecord(row: MapPointRow): MapPointRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    ref: row.ref,
    name: row.name,
    category: row.category as MapPointCategory,
    nodeRole: (row.nodeRole as MapPointNodeRole | null) ?? null,
    longitude: row.location.x,
    latitude: row.location.y,
    elevation: row.elevation,
    elevationSource: (row.elevationSource as MapPointElevationSource | null) ?? null,
    description: row.description,
    parentRef: row.parentRef,
    sortOrder: row.sortOrder,
    imageX: row.imageX,
    imageY: row.imageY,
    metadata: (row.metadata as MapPointRecord["metadata"]) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeRef(ref: string | null | undefined): string | null {
  const trimmed = ref?.trim();
  return trimmed ? trimmed : null;
}

async function assertRefAvailable(mapId: number, ref: string | null, excludePointId?: number) {
  if (!ref) {
    return;
  }

  const db = getPgliteDb();
  const conditions = [eq(mapPointTable.mapId, mapId), eq(mapPointTable.ref, ref)];
  if (excludePointId !== undefined) {
    conditions.push(ne(mapPointTable.id, excludePointId));
  }

  const [conflict] = await db
    .select({ id: mapPointTable.id })
    .from(mapPointTable)
    .where(and(...conditions))
    .limit(1);

  if (conflict) {
    throw new Error(`Reference "${ref}" is already used by another point on this map.`);
  }
}

export async function listMapPoints(mapId: number): Promise<MapPointRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(mapPointTable)
    .where(eq(mapPointTable.mapId, mapId))
    .orderBy(asc(mapPointTable.sortOrder), asc(mapPointTable.id));

  return rows.map(toRecord);
}

export async function createMapPoint(input: CreateMapPointInput): Promise<MapPointRecord> {
  const db = getPgliteDb();
  const ref = normalizeRef(input.ref);
  await assertRefAvailable(input.mapId, ref);

  const [row] = await db
    .insert(mapPointTable)
    .values({
      mapId: input.mapId,
      ref,
      name: input.name?.trim() || null,
      category: input.category ?? "custom",
      nodeRole: input.nodeRole ?? null,
      location: { x: input.longitude, y: input.latitude },
      elevation: input.elevation ?? null,
      elevationSource: input.elevationSource ?? null,
      description: input.description?.trim() || null,
      parentRef: normalizeRef(input.parentRef),
      sortOrder: input.sortOrder ?? 0,
      imageX: input.imageX ?? null,
      imageY: input.imageY ?? null,
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create point.");
  }

  return toRecord(row);
}

export async function updateMapPoint(input: UpdateMapPointInput): Promise<MapPointRecord> {
  const db = getPgliteDb();

  const patch: Partial<typeof mapPointTable.$inferInsert> = { updatedAt: new Date() };

  if (input.longitude !== undefined && input.latitude !== undefined) {
    patch.location = { x: input.longitude, y: input.latitude };
  }
  if (input.ref !== undefined) {
    const ref = normalizeRef(input.ref);
    await assertRefAvailable(input.mapId, ref, input.pointId);
    patch.ref = ref;
  }
  if (input.name !== undefined) {
    patch.name = input.name?.trim() || null;
  }
  if (input.category !== undefined) {
    patch.category = input.category;
  }
  if (input.nodeRole !== undefined) {
    patch.nodeRole = input.nodeRole;
  }
  if (input.elevation !== undefined) {
    patch.elevation = input.elevation;
  }
  if (input.elevationSource !== undefined) {
    patch.elevationSource = input.elevationSource;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.parentRef !== undefined) {
    patch.parentRef = normalizeRef(input.parentRef);
  }
  if (input.sortOrder !== undefined) {
    patch.sortOrder = input.sortOrder;
  }
  if (input.imageX !== undefined) {
    patch.imageX = input.imageX;
  }
  if (input.imageY !== undefined) {
    patch.imageY = input.imageY;
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata ?? {};
  }

  const [row] = await db
    .update(mapPointTable)
    .set(patch)
    .where(and(eq(mapPointTable.id, input.pointId), eq(mapPointTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Point not found.");
  }

  return toRecord(row);
}

export async function deleteMapPoint(input: DeleteMapPointInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(mapPointTable)
    .where(and(eq(mapPointTable.id, input.pointId), eq(mapPointTable.mapId, input.mapId)));

  return { ok: true };
}
