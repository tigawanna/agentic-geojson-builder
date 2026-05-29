import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";

export type KaruraTrailProperties = {
  slug: string;
  name: string;
  source: string;
  geometrySource: string;
  trailforkId: number | null;
  trailforkUrl: string | null;
  trailfork: Record<string, unknown>;
  sources: Record<string, unknown>;
  vertexCount: number;
  warnings: string[];
};

export const karuraTrailTable = pgTable(
  "karura_trails",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar({ length: 255 }).notNull().unique(),
    trailforkId: integer("trailfork_id"),
    name: varchar({ length: 255 }).notNull(),
    source: varchar({ length: 32 }).notNull().default("trailfork"),
    geometrySource: varchar("geometry_source", { length: 16 }).notNull(),
    properties: jsonb().$type<KaruraTrailProperties>().notNull(),
    geometryJson: jsonb("geometry_json").$type<StoredLineStringGeometry>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("karura_trails_trailfork_id_idx").on(table.trailforkId),
    index("karura_trails_source_idx").on(table.source),
  ],
);

export type KaruraTrailRecord = typeof karuraTrailTable.$inferSelect;
