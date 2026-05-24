import "@tanstack/react-start/server-only";

import { assertMapBelongsToUser } from "@/data-access-layer/maps/maps.server";
import { db } from "@/lib/drizzle/client.server";
import { controlPointTable } from "@/lib/drizzle/schema/maps/control-point.schema";
import { and, asc, eq } from "drizzle-orm";
import type {
  CreateControlPointInput,
  ControlPointViewModel,
  DeleteControlPointInput,
  UpdateControlPointInput,
} from "./control-points.types";

type ControlPointRecord = typeof controlPointTable.$inferSelect;

function toControlPointViewModel(row: ControlPointRecord): ControlPointViewModel {
  return {
    id: row.id,
    mapId: row.mapId,
    label: row.label,
    imageX: row.imageX,
    imageY: row.imageY,
    longitude: row.location.x,
    latitude: row.location.y,
    createdAt: row.createdAt,
  };
}

export async function listControlPointsForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const rows = await db
    .select()
    .from(controlPointTable)
    .where(eq(controlPointTable.mapId, mapId))
    .orderBy(asc(controlPointTable.id));

  return rows.map(toControlPointViewModel);
}

export async function createControlPointForUser(userId: string, input: CreateControlPointInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  const [row] = await db
    .insert(controlPointTable)
    .values({
      mapId: input.mapId,
      imageX: input.imageX,
      imageY: input.imageY,
      location: { x: input.longitude, y: input.latitude },
      label: input.label ?? null,
    })
    .returning();

  return toControlPointViewModel(row);
}

export async function updateControlPointForUser(userId: string, input: UpdateControlPointInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  const [row] = await db
    .update(controlPointTable)
    .set({
      imageX: input.imageX,
      imageY: input.imageY,
      location: { x: input.longitude, y: input.latitude },
    })
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    )
    .returning();

  if (!row) {
    throw new Error("Reference point not found.");
  }

  return toControlPointViewModel(row);
}

export async function deleteControlPointForUser(userId: string, input: DeleteControlPointInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  await db
    .delete(controlPointTable)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    );
}
