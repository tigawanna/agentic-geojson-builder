import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index,
  primaryKey,
  geometry,
} from "drizzle-orm/pg-core";
import { organization } from "./auth-schema";

export const cuisineType = pgTable("cuisine_type", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
});

export const kitchenProfile = pgTable(
  "kitchen_profile",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: "cascade" }),
    description: text("description"),
    phone: text("phone"),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
    address: text("address"),
    neighborhood: text("neighborhood"),
    deliveryRadiusKm: decimal("delivery_radius_km", { precision: 5, scale: 2 }),
    isOpen: boolean("is_open").default(false).notNull(),
    operatingHours: jsonb("operating_hours").$type<
      Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { opensAt: string; closesAt: string }>>
    >(),
    coverImage: text("cover_image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("kitchen_profile_spatial_open_idx")
      .using("gist", table.location)
      .where(sql`is_open = true`),
    index("kitchen_profile_neighborhood_idx").on(table.neighborhood),
  ],
);

export const kitchenCuisine = pgTable(
  "kitchen_cuisine",
  {
    kitchenId: text("kitchen_id")
      .notNull()
      .references(() => kitchenProfile.id, { onDelete: "cascade" }),
    cuisineId: text("cuisine_id")
      .notNull()
      .references(() => cuisineType.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.kitchenId, table.cuisineId] }),
    index("kitchen_cuisine_cuisine_id_idx").on(table.cuisineId),
  ],
);

export const cuisineTypeRelations = relations(cuisineType, ({ many }) => ({
  kitchens: many(kitchenCuisine),
}));

export const kitchenProfileRelations = relations(kitchenProfile, ({ one, many }) => ({
  organization: one(organization, {
    fields: [kitchenProfile.organizationId],
    references: [organization.id],
  }),
  cuisines: many(kitchenCuisine),
}));

export const kitchenCuisineRelations = relations(kitchenCuisine, ({ one }) => ({
  kitchen: one(kitchenProfile, {
    fields: [kitchenCuisine.kitchenId],
    references: [kitchenProfile.id],
  }),
  cuisine: one(cuisineType, {
    fields: [kitchenCuisine.cuisineId],
    references: [cuisineType.id],
  }),
}));
