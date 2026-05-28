import { geometry, integer, pgTable, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { mapTable } from "@main/lib/pglite/schema/map.schema";

export const controlPointTable = pgTable("control_point", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  mapId: integer("map_id")
    .notNull()
    .references(() => mapTable.id, { onDelete: "cascade" }),
  label: varchar({ length: 255 }),
  imageX: real("image_x").notNull(),
  imageY: real("image_y").notNull(),
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
