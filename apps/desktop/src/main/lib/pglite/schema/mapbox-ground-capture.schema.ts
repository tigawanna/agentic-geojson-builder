import {
  boolean,
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { MapboxCaptureTags } from "@shared/mapbox-capture.types.js";

export const mapboxGroundCaptureTable = pgTable(
  "mapbox_ground_capture",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    tags: jsonb("tags").$type<MapboxCaptureTags>().notNull().default({}),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    elevation: real("elevation"),
    layerId: varchar("layer_id", { length: 128 }),
    sourceLayer: varchar("source_layer", { length: 128 }),
    baseMapStyle: varchar("base_map_style", { length: 64 }),
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("mapbox_ground_capture_approved_idx").on(table.approved),
    index("mapbox_ground_capture_created_at_idx").on(table.createdAt),
  ],
);

export type MapboxGroundCaptureRow = typeof mapboxGroundCaptureTable.$inferSelect;
