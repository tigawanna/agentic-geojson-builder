import { and, asc, eq } from "drizzle-orm";
import type {
  ControlPointRecord,
  CreateControlPointInput,
  DeleteControlPointInput,
  UpdateControlPointInput,
} from "@shared/control-points.types.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { controlPointTable } from "@main/lib/pglite/schema/control-point.schema.js";

type ControlPointRow = typeof controlPointTable.$inferSelect;

function toControlPointRecord(row: ControlPointRow): ControlPointRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    label: row.label,
    imageX: row.imageX,
    imageY: row.imageY,
    longitude: row.location.x,
    latitude: row.location.y,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listControlPoints(mapId: number): Promise<ControlPointRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(controlPointTable)
    .where(eq(controlPointTable.mapId, mapId))
    .orderBy(asc(controlPointTable.id));

  return rows.map(toControlPointRecord);
}

export async function createControlPoint(
  input: CreateControlPointInput,
): Promise<ControlPointRecord> {
  const db = getPgliteDb();
  const [row] = await db
    .insert(controlPointTable)
    .values({
      mapId: input.mapId,
      imageX: input.imageX,
      imageY: input.imageY,
      location: { x: input.longitude, y: input.latitude },
      label: input.label?.trim() || null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create control point.");
  }

  return toControlPointRecord(row);
}

export async function updateControlPoint(
  input: UpdateControlPointInput,
): Promise<ControlPointRecord> {
  const db = getPgliteDb();
  const patch: Partial<typeof controlPointTable.$inferInsert> = {
    imageX: input.imageX,
    imageY: input.imageY,
    location: { x: input.longitude, y: input.latitude },
  };
  if (input.label !== undefined) {
    patch.label = input.label?.trim() || null;
  }

  const [row] = await db
    .update(controlPointTable)
    .set(patch)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    )
    .returning();

  if (!row) {
    throw new Error("Reference point not found.");
  }

  return toControlPointRecord(row);
}

export async function deleteControlPoint(input: DeleteControlPointInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(controlPointTable)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    );

  return { ok: true };
}
