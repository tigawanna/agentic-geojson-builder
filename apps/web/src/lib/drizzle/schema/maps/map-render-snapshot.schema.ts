import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import type { RenderedMapView } from "@/lib/rendered-map-view/types";
import { mapTable } from "./map.schema";

export const mapRenderSnapshotTable = pgTable(
  "map_render_snapshot",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    source: varchar({ length: 32 }).notNull().default("client"),
    snapshotJson: jsonb("snapshot_json").$type<RenderedMapView>().notNull(),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("map_render_snapshot_map_id_uidx").on(table.mapId),
    index("map_render_snapshot_captured_at_idx").on(table.capturedAt),
  ],
);

export type MapRenderSnapshotRecord = typeof mapRenderSnapshotTable.$inferSelect;
