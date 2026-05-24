import { integer, pgTable, real, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { mapTable } from "./map.schema";

export const mapTileCacheTable = pgTable(
  "map_tile_cache",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    centerLat: real("center_lat").notNull(),
    centerLng: real("center_lng").notNull(),
    halfSideMeters: real("half_side_meters").notNull(),
    minZoom: integer("min_zoom").notNull().default(14),
    maxZoom: integer("max_zoom").notNull().default(17),
    style: varchar({ length: 32 }).notNull().default("satellite"),
    tileCount: integer("tile_count").notNull().default(0),
    builtAt: timestamp("built_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("map_tile_cache_map_id_uidx").on(table.mapId)],
);

export type MapTileCacheRecord = typeof mapTileCacheTable.$inferSelect;
