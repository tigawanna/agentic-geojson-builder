import { index, integer, jsonb, pgTable, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { mapTable } from "./map.schema";

export type StoredLineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export const geoSegmentTable = pgTable(
  "geo_segment",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    segmentGroupId: varchar("segment_group_id", { length: 128 }).notNull(),
    segmentIndex: integer("segment_index").notNull().default(0),
    name: varchar({ length: 255 }),
    pathKind: varchar("path_kind", { length: 32 }).notNull().default("unknown"),
    status: varchar({ length: 32 }).notNull().default("draft"),
    coordinateSpace: varchar("coordinate_space", { length: 32 }).notNull().default("wgs84"),
    geometryJson: jsonb("geometry_json").$type<StoredLineStringGeometry>().notNull(),
    confidence: real("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("geo_segment_map_id_idx").on(table.mapId),
    index("geo_segment_map_group_idx").on(table.mapId, table.segmentGroupId),
  ],
);

export type GeoSegmentRecord = typeof geoSegmentTable.$inferSelect;
