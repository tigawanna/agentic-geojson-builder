import { and, asc, eq } from "drizzle-orm";
import type {
  ControlPointAttachmentRecord,
  ControlPointRecord,
  AddControlPointAttachmentInput,
  CreateControlPointInput,
  DeleteControlPointInput,
  ListControlPointAttachmentsInput,
  RemoveControlPointAttachmentInput,
  UpdateControlPointInput,
} from "@shared/control-points.types.js";
import { writeAuditEntry } from "@main/lib/pglite/audit-log.service.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  controlPointAttachmentTable,
  controlPointTable,
} from "@main/lib/pglite/schema/control-point.schema.js";

type ControlPointRow = typeof controlPointTable.$inferSelect;
type AttachmentRow = typeof controlPointAttachmentTable.$inferSelect;

function toControlPointRecord(row: ControlPointRow): ControlPointRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    label: row.label,
    poleNumber: row.poleNumber,
    description: row.description,
    imageX: row.imageX,
    imageY: row.imageY,
    longitude: row.location.x,
    latitude: row.location.y,
    altitudeM: row.altitudeM,
    metadata: (row.metadata as ControlPointRecord["metadata"]) ?? {},
    contextSnapshot: (row.contextSnapshot as ControlPointRecord["contextSnapshot"]) ?? null,
    sourceSegmentId: row.sourceSegmentId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAttachmentRecord(row: AttachmentRow): ControlPointAttachmentRecord {
  return {
    id: row.id,
    controlPointId: row.controlPointId,
    filePath: row.filePath,
    mimeType: row.mimeType,
    caption: row.caption,
    sortOrder: row.sortOrder,
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
      poleNumber: input.poleNumber?.trim() || null,
      description: input.description?.trim() || null,
      altitudeM: input.altitudeM ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create control point.");
  }

  const record = toControlPointRecord(row);
  void writeAuditEntry({
    mapId: input.mapId,
    entityType: "control_point",
    entityId: record.id,
    action: "create",
    newValue: record,
  });
  return record;
}

export async function updateControlPoint(
  input: UpdateControlPointInput,
): Promise<ControlPointRecord> {
  const db = getPgliteDb();

  const [existing] = await db
    .select()
    .from(controlPointTable)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    );

  const patch: Partial<typeof controlPointTable.$inferInsert> = {
    imageX: input.imageX,
    imageY: input.imageY,
    location: { x: input.longitude, y: input.latitude },
  };

  if (input.label !== undefined) {
    patch.label = input.label?.trim() || null;
  }
  if (input.poleNumber !== undefined) {
    patch.poleNumber = input.poleNumber?.trim() || null;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.altitudeM !== undefined) {
    patch.altitudeM = input.altitudeM;
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata ?? {};
  }
  if (input.contextSnapshot !== undefined) {
    patch.contextSnapshot = input.contextSnapshot;
  }
  if (input.sourceSegmentId !== undefined) {
    patch.sourceSegmentId = input.sourceSegmentId;
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

  const record = toControlPointRecord(row);
  void writeAuditEntry({
    mapId: input.mapId,
    entityType: "control_point",
    entityId: record.id,
    action: "update",
    oldValue: existing ? toControlPointRecord(existing) : null,
    newValue: record,
  });
  return record;
}

export async function deleteControlPoint(input: DeleteControlPointInput): Promise<{ ok: true }> {
  const db = getPgliteDb();
  const [existing] = await db
    .select()
    .from(controlPointTable)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    );

  await db
    .delete(controlPointTable)
    .where(
      and(eq(controlPointTable.id, input.controlPointId), eq(controlPointTable.mapId, input.mapId)),
    );

  if (existing) {
    void writeAuditEntry({
      mapId: input.mapId,
      entityType: "control_point",
      entityId: input.controlPointId,
      action: "delete",
      oldValue: toControlPointRecord(existing),
    });
  }

  return { ok: true };
}

export async function listControlPointAttachments(
  input: ListControlPointAttachmentsInput,
): Promise<ControlPointAttachmentRecord[]> {
  const db = getPgliteDb();
  const rows = await db
    .select()
    .from(controlPointAttachmentTable)
    .where(eq(controlPointAttachmentTable.controlPointId, input.controlPointId))
    .orderBy(asc(controlPointAttachmentTable.sortOrder), asc(controlPointAttachmentTable.id));

  return rows.map(toAttachmentRecord);
}

export async function addControlPointAttachment(
  input: AddControlPointAttachmentInput,
): Promise<ControlPointAttachmentRecord> {
  const db = getPgliteDb();
  const [row] = await db
    .insert(controlPointAttachmentTable)
    .values({
      controlPointId: input.controlPointId,
      filePath: input.filePath,
      mimeType: input.mimeType,
      caption: input.caption?.trim() || null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to add attachment.");
  }

  return toAttachmentRecord(row);
}

export async function removeControlPointAttachment(
  input: RemoveControlPointAttachmentInput,
): Promise<{ ok: true }> {
  const db = getPgliteDb();
  await db
    .delete(controlPointAttachmentTable)
    .where(eq(controlPointAttachmentTable.id, input.attachmentId));

  return { ok: true };
}
