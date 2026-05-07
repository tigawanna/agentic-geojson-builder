import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  geometry,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { kitchenProfile } from "./kitchen-schema";

export const customerFavorite = pgTable(
  "customer_favorite",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kitchenId: text("kitchen_id")
      .notNull()
      .references(() => kitchenProfile.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("customer_favorite_user_kitchen_uidx").on(table.userId, table.kitchenId),
    index("customer_favorite_kitchen_id_idx").on(table.kitchenId),
  ],
);

export const customerLocation = pgTable(
  "customer_location",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    address: text("address"),
    neighborhood: text("neighborhood"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("customer_location_user_id_idx").on(table.userId),
    index("customer_location_spatial_idx").using("gist", table.location),
  ],
);

export const customerFavoriteRelations = relations(customerFavorite, ({ one }) => ({
  user: one(user, {
    fields: [customerFavorite.userId],
    references: [user.id],
  }),
  kitchen: one(kitchenProfile, {
    fields: [customerFavorite.kitchenId],
    references: [kitchenProfile.id],
  }),
}));

export const customerLocationRelations = relations(customerLocation, ({ one }) => ({
  user: one(user, {
    fields: [customerLocation.userId],
    references: [user.id],
  }),
}));
