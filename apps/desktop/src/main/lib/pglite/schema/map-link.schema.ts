import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { mapTable } from "@main/lib/pglite/schema/map.schema";

export const mapLinkTable = pgTable(
  "map_link",
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
    bidirectional: boolean("bidirectional").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("map_link_map_id_idx").on(table.mapId),
    uniqueIndex("map_link_edge_idx").on(table.mapId, table.fromRef, table.toRef, table.pathSlug),
  ],
);

export type MapLinkRow = typeof mapLinkTable.$inferSelect;
