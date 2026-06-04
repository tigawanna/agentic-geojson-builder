import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { TrailMetadata } from "@shared/trails.types.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema";
import { segmentEdgeTable } from "@main/lib/pglite/schema/segment-edge.schema";

export const trailTable = pgTable(
  "trail",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    slug: varchar({ length: 128 }).notNull(),
    name: varchar({ length: 255 }),
    kind: varchar({ length: 32 }).notNull().default("route"),
    color: varchar({ length: 16 }),
    status: varchar({ length: 32 }).notNull().default("draft"),
    metadata: jsonb("metadata").$type<TrailMetadata>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("trail_map_id_idx").on(table.mapId),
    uniqueIndex("trail_map_slug_idx").on(table.mapId, table.slug),
  ],
);

export const trailMemberTable = pgTable(
  "trail_member",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    trailId: integer("trail_id")
      .notNull()
      .references(() => trailTable.id, { onDelete: "cascade" }),
    segmentEdgeId: integer("segment_edge_id")
      .notNull()
      .references(() => segmentEdgeTable.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    direction: varchar({ length: 8 }).notNull().default("forward"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("trail_member_trail_id_idx").on(table.trailId),
    uniqueIndex("trail_member_trail_order_idx").on(table.trailId, table.orderIndex),
  ],
);

export type TrailRow = typeof trailTable.$inferSelect;
export type TrailMemberRow = typeof trailMemberTable.$inferSelect;
