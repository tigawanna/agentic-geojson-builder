import { desc, eq, and, count } from "drizzle-orm";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  auditLogTable,
  type AuditAction,
  type AuditEntityType,
  type AuditLogRecord,
} from "@main/lib/pglite/schema/audit-log.schema.js";

type WriteAuditEntryInput = {
  mapId: number;
  entityType: AuditEntityType;
  entityId: number;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  source?: string;
};

export async function writeAuditEntry(input: WriteAuditEntryInput): Promise<void> {
  const db = getPgliteDb();
  await db.insert(auditLogTable).values({
    mapId: input.mapId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    source: input.source ?? "user",
  });
}

type ListAuditLogOptions = {
  entityType?: AuditEntityType;
  entityId?: number;
  limit?: number;
  offset?: number;
};

type ListAuditLogResult = {
  entries: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function listAuditLog(
  mapId: number,
  options?: ListAuditLogOptions,
): Promise<ListAuditLogResult> {
  const db = getPgliteDb();
  const conditions = [eq(auditLogTable.mapId, mapId)];

  if (options?.entityType) {
    conditions.push(eq(auditLogTable.entityType, options.entityType));
  }
  if (options?.entityId) {
    conditions.push(eq(auditLogTable.entityId, options.entityId));
  }

  const whereClause = and(...conditions);
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const [entries, [countRow]] = await Promise.all([
    db
      .select()
      .from(auditLogTable)
      .where(whereClause)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(auditLogTable).where(whereClause),
  ]);

  return {
    entries,
    total: countRow?.total ?? 0,
    limit,
    offset,
  };
}
