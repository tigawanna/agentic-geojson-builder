import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const mapTable = pgTable("map", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
});
