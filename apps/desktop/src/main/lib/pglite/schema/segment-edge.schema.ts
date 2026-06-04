import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";
import type { SegmentEdgeMetadata } from "@shared/segments.types.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema";

export const segmentEdgeTable = pgTable(
  "segment_edge",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    fromRef: varchar("from_ref", { length: 64 }).notNull(),
    toRef: varchar("to_ref", { length: 64 }).notNull(),
    pathSlug: varchar("path_slug", { length: 128 }).notNull(),
    startFraction: real("start_fraction"),
    endFraction: real("end_fraction"),
    geometryJson: jsonb("geometry_json").$type<StoredLineStringGeometry>(),
    lengthM: real("length_m"),
    kind: varchar({ length: 32 }).notNull().default("unknown"),
    bidirectional: boolean("bidirectional").notNull().default(true),
    status: varchar({ length: 32 }).notNull().default("draft"),
    metadata: jsonb("metadata").$type<SegmentEdgeMetadata>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("segment_edge_map_id_idx").on(table.mapId),
    uniqueIndex("segment_edge_edge_idx").on(
      table.mapId,
      table.fromRef,
      table.toRef,
      table.pathSlug,
    ),
  ],
);

export type SegmentEdgeRow = typeof segmentEdgeTable.$inferSelect;
