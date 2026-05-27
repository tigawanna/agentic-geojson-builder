import { integer, pgTable, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { bytea } from "./bytea";

export const mapTable = pgTable("map", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 1024 }),
  folderPath: varchar("folder_path", { length: 1024 }),
  locationQuery: varchar("location_query", { length: 512 }),
  mapCenterLat: real("map_center_lat"),
  mapCenterLng: real("map_center_lng"),
  mapZoom: real("map_zoom"),
  baseMapStyle: varchar("base_map_style", { length: 32 }).default("satellite").notNull(),
  pdfScale: real("pdf_scale").default(1).notNull(),
  pdfRotation: real("pdf_rotation").default(0).notNull(),
  pdfPanX: real("pdf_pan_x").default(0).notNull(),
  pdfPanY: real("pdf_pan_y").default(0).notNull(),
  pdfFileName: varchar("pdf_file_name", { length: 512 }),
  pdfData: bytea("pdf_data"),
  pdfPageCount: integer("pdf_page_count"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MapRecord = typeof mapTable.$inferSelect;
