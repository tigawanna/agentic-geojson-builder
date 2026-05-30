import {
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { mapTable } from "@main/lib/pglite/schema/map.schema";
import { geoSegmentTable } from "@main/lib/pglite/schema/geo-segment.schema";

export type ControlPointMetadata = Record<string, string>;

export type ControlPointContextSnapshot = {
  capturedAt: string;
  distanceMeters: number;
  source: {
    type: "geo_segment" | "reference_geojson";
    id: number | string;
    name: string | null;
    pathKind: string | null;
  };
  position: {
    latitude: number;
    longitude: number;
    altitudeM: number | null;
  };
  properties: Record<string, unknown>;
};

export const controlPointTable = pgTable(
  "control_point",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    label: varchar({ length: 255 }),
    poleNumber: varchar("pole_number", { length: 64 }),
    description: text("description"),
    imageX: real("image_x").notNull(),
    imageY: real("image_y").notNull(),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    altitudeM: real("altitude_m"),
    metadata: jsonb("metadata").$type<ControlPointMetadata>().default({}),
    contextSnapshot: jsonb("context_snapshot").$type<ControlPointContextSnapshot>(),
    sourceSegmentId: integer("source_segment_id").references(() => geoSegmentTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("control_point_map_id_idx").on(table.mapId)],
);

export const controlPointAttachmentTable = pgTable(
  "control_point_attachment",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    controlPointId: integer("control_point_id")
      .notNull()
      .references(() => controlPointTable.id, { onDelete: "cascade" }),
    filePath: varchar("file_path", { length: 1024 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    caption: varchar("caption", { length: 512 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("control_point_attachment_cp_id_idx").on(table.controlPointId)],
);
