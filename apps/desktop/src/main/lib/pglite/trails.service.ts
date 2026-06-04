import { and, asc, eq } from "drizzle-orm";
import type {
  CreateTrailInput,
  DeleteTrailInput,
  SetTrailMembersInput,
  TrailKind,
  TrailMemberDirection,
  TrailMemberRecord,
  TrailRecord,
  TrailStatus,
  UpdateTrailInput,
} from "@shared/trails.types.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  trailMemberTable,
  trailTable,
  type TrailMemberRow,
  type TrailRow,
} from "@main/lib/pglite/schema/trail.schema.js";

function toMemberRecord(row: TrailMemberRow): TrailMemberRecord {
  return {
    id: row.id,
    trailId: row.trailId,
    segmentEdgeId: row.segmentEdgeId,
    orderIndex: row.orderIndex,
    direction: row.direction as TrailMemberDirection,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadMembers(trailId: number): Promise<TrailMemberRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(trailMemberTable)
    .where(eq(trailMemberTable.trailId, trailId))
    .orderBy(asc(trailMemberTable.orderIndex), asc(trailMemberTable.id));

  return rows.map(toMemberRecord);
}

function toTrailRecord(row: TrailRow, members: TrailMemberRecord[]): TrailRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    slug: row.slug,
    name: row.name,
    kind: row.kind as TrailKind,
    color: row.color,
    status: row.status as TrailStatus,
    metadata: row.metadata ?? {},
    members,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTrails(mapId: number): Promise<TrailRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(trailTable)
    .where(eq(trailTable.mapId, mapId))
    .orderBy(asc(trailTable.slug), asc(trailTable.id));

  const trails: TrailRecord[] = [];
  for (const row of rows) {
    trails.push(toTrailRecord(row, await loadMembers(row.id)));
  }
  return trails;
}

export async function createTrail(input: CreateTrailInput): Promise<TrailRecord> {
  const db = getPgliteDb();
  const slug = input.slug.trim();
  if (!slug) {
    throw new Error("Trail slug is required.");
  }

  const [row] = await db
    .insert(trailTable)
    .values({
      mapId: input.mapId,
      slug,
      name: input.name?.trim() || null,
      kind: input.kind ?? "route",
      color: input.color ?? null,
      status: input.status ?? "draft",
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create trail.");
  }

  return toTrailRecord(row, []);
}

export async function updateTrail(input: UpdateTrailInput): Promise<TrailRecord> {
  const db = getPgliteDb();
  const patch: Partial<typeof trailTable.$inferInsert> = { updatedAt: new Date() };

  if (input.slug !== undefined) {
    patch.slug = input.slug.trim();
  }
  if (input.name !== undefined) {
    patch.name = input.name?.trim() || null;
  }
  if (input.kind !== undefined) {
    patch.kind = input.kind;
  }
  if (input.color !== undefined) {
    patch.color = input.color;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata ?? {};
  }

  const [row] = await db
    .update(trailTable)
    .set(patch)
    .where(and(eq(trailTable.id, input.trailId), eq(trailTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Trail not found.");
  }

  return toTrailRecord(row, await loadMembers(row.id));
}

export async function deleteTrail(input: DeleteTrailInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(trailTable)
    .where(and(eq(trailTable.id, input.trailId), eq(trailTable.mapId, input.mapId)));

  return { ok: true };
}

export async function setTrailMembers(input: SetTrailMembersInput): Promise<TrailRecord> {
  const db = getPgliteDb();
  const [trail] = await db
    .select()
    .from(trailTable)
    .where(and(eq(trailTable.id, input.trailId), eq(trailTable.mapId, input.mapId)))
    .limit(1);

  if (!trail) {
    throw new Error("Trail not found.");
  }

  await db.delete(trailMemberTable).where(eq(trailMemberTable.trailId, input.trailId));

  const ordered = [...input.members].sort((left, right) => left.orderIndex - right.orderIndex);

  for (const member of ordered) {
    await db.insert(trailMemberTable).values({
      trailId: input.trailId,
      segmentEdgeId: member.segmentEdgeId,
      orderIndex: member.orderIndex,
      direction: member.direction ?? "forward",
      updatedAt: new Date(),
    });
  }

  return toTrailRecord(trail, await loadMembers(input.trailId));
}
