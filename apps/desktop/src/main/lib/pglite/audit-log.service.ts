import { desc, eq, and, count, or, ilike, sql, type SQL } from "drizzle-orm";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import {
  auditLogTable,
  type AuditAction,
  type AuditEntityType,
} from "@main/lib/pglite/schema/audit-log.schema.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema.js";

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

export type AuditLogListEntry = {
  id: number;
  mapId: number;
  mapName: string | null;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  createdAt: Date;
};

type ListAuditLogInput = {
  mapId?: number;
  entityType?: AuditEntityType;
  entityId?: number;
  action?: AuditAction;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type ListAuditLogResult = {
  entries: AuditLogListEntry[];
  total: number;
  limit: number;
  offset: number;
};

function buildAuditLogConditions(input?: ListAuditLogInput): SQL | undefined {
  const conditions: SQL[] = [];

  if (input?.mapId != null) {
    conditions.push(eq(auditLogTable.mapId, input.mapId));
  }
  if (input?.entityType) {
    conditions.push(eq(auditLogTable.entityType, input.entityType));
  }
  if (input?.entityId) {
    conditions.push(eq(auditLogTable.entityId, input.entityId));
  }
  if (input?.action) {
    conditions.push(eq(auditLogTable.action, input.action));
  }
  if (input?.source) {
    conditions.push(eq(auditLogTable.source, input.source));
  }
  if (input?.search?.trim()) {
    const term = `%${input.search.trim()}%`;
    conditions.push(
      or(
        ilike(auditLogTable.entityType, term),
        ilike(auditLogTable.action, term),
        ilike(auditLogTable.source, term),
        ilike(mapTable.name, term),
        sql`${auditLogTable.entityId}::text ILIKE ${term}`,
        sql`${auditLogTable.mapId}::text ILIKE ${term}`,
        sql`${auditLogTable.oldValue}::text ILIKE ${term}`,
        sql`${auditLogTable.newValue}::text ILIKE ${term}`,
      )!,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listAuditLog(input?: ListAuditLogInput): Promise<ListAuditLogResult> {
  const db = getPgliteDb();
  const whereClause = buildAuditLogConditions(input);
  const limit = input?.limit ?? 20;
  const offset = input?.offset ?? 0;

  const baseQuery = db
    .select({
      id: auditLogTable.id,
      mapId: auditLogTable.mapId,
      mapName: mapTable.name,
      entityType: auditLogTable.entityType,
      entityId: auditLogTable.entityId,
      action: auditLogTable.action,
      oldValue: auditLogTable.oldValue,
      newValue: auditLogTable.newValue,
      source: auditLogTable.source,
      createdAt: auditLogTable.createdAt,
    })
    .from(auditLogTable)
    .leftJoin(mapTable, eq(auditLogTable.mapId, mapTable.id));

  const countQuery = db
    .select({ total: count() })
    .from(auditLogTable)
    .leftJoin(mapTable, eq(auditLogTable.mapId, mapTable.id));

  const [entries, [countRow]] = await Promise.all([
    (whereClause ? baseQuery.where(whereClause) : baseQuery)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit)
      .offset(offset),
    whereClause ? countQuery.where(whereClause) : countQuery,
  ]);

  return {
    entries,
    total: countRow?.total ?? 0,
    limit,
    offset,
  };
}
