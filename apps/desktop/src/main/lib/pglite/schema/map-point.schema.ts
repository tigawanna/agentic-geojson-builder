import { sql } from "drizzle-orm";
import {
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { MapPointMetadata } from "@shared/map-points.types.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema";

export const mapPointTable = pgTable(
  "map_point",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    ref: varchar({ length: 64 }),
    name: varchar({ length: 255 }),
    category: varchar({ length: 32 }).notNull().default("custom"),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    elevation: real("elevation"),
    elevationSource: varchar("elevation_source", { length: 32 }),
    description: text("description"),
    parentRef: varchar("parent_ref", { length: 64 }),
    sortOrder: integer("sort_order").notNull().default(0),
    imageX: real("image_x"),
    imageY: real("image_y"),
    metadata: jsonb("metadata").$type<MapPointMetadata>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("map_point_map_id_idx").on(table.mapId),
    uniqueIndex("map_point_map_ref_idx")
      .on(table.mapId, table.ref)
      .where(sql`${table.ref} is not null`),
  ],
);

export type MapPointRow = typeof mapPointTable.$inferSelect;
