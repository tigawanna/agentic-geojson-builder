import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export type AuditEntityType = "control_point" | "geo_segment" | "map";
export type AuditAction = "create" | "update" | "delete";

export const auditLogTable = pgTable(
  "audit_log",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id").notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: integer("entity_id").notNull(),
    action: varchar({ length: 16 }).notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    source: varchar({ length: 32 }).notNull().default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_map_id_idx").on(table.mapId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

export type AuditLogRecord = typeof auditLogTable.$inferSelect;
