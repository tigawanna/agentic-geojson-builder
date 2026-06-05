import { index, integer, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { mapPointTable } from "@main/lib/pglite/schema/map-point.schema";
import { mapTable } from "@main/lib/pglite/schema/map.schema";

export const markerNeighborTable = pgTable(
  "marker_neighbor",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    fromMarkerId: integer("from_marker_id")
      .notNull()
      .references(() => mapPointTable.id, { onDelete: "cascade" }),
    toMarkerId: integer("to_marker_id")
      .notNull()
      .references(() => mapPointTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("marker_neighbor_map_id_idx").on(table.mapId),
    index("marker_neighbor_from_marker_id_idx").on(table.fromMarkerId),
    uniqueIndex("marker_neighbor_edge_idx").on(table.mapId, table.fromMarkerId, table.toMarkerId),
  ],
);

export type MarkerNeighborRow = typeof markerNeighborTable.$inferSelect;
