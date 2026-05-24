import { integer, jsonb, pgTable, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { mapTable } from "./map.schema";

export type StoredAffineCoefficients = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export const georeferenceTable = pgTable("georeference", {
  mapId: integer("map_id")
    .primaryKey()
    .references(() => mapTable.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 32 }).notNull().default("affine"),
  coefficients: jsonb("coefficients").$type<StoredAffineCoefficients>().notNull(),
  controlPointCount: integer("control_point_count").notNull(),
  residualErrorMeters: real("residual_error_meters").notNull(),
  maxErrorMeters: real("max_error_meters").notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
});

export type GeoreferenceRecord = typeof georeferenceTable.$inferSelect;
