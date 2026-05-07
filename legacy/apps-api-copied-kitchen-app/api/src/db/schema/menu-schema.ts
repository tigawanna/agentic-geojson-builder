import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { kitchenProfile } from "./kitchen-schema";

export const menuCategory = pgTable(
  "menu_category",
  {
    id: text("id").primaryKey(),
    kitchenId: text("kitchen_id")
      .notNull()
      .references(() => kitchenProfile.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("menu_category_kitchen_id_idx").on(table.kitchenId)],
);

export const menuItem = pgTable(
  "menu_item",
  {
    id: text("id").primaryKey(),
    kitchenId: text("kitchen_id")
      .notNull()
      .references(() => kitchenProfile.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => menuCategory.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    image: text("image"),
    isAvailable: boolean("is_available").default(true).notNull(),
    isDailySpecial: boolean("is_daily_special").default(false).notNull(),
    servingSize: text("serving_size"),
    preparationTimeMins: integer("preparation_time_mins"),
    dietaryTags: text("dietary_tags").array(),
    embedding: vector("embedding", { dimensions: 1536 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("menu_item_kitchen_available_idx").on(table.kitchenId, table.isAvailable),
    index("menu_item_category_id_idx").on(table.categoryId),
    index("menu_item_search_idx").using(
      "gin",
      sql`(
        setweight(to_tsvector('simple', ${table.name}), 'A') ||
        setweight(to_tsvector('simple', coalesce(${table.description}, '')), 'B')
      )`,
    ),
  ],
);

export const menuCategoryRelations = relations(menuCategory, ({ one, many }) => ({
  kitchen: one(kitchenProfile, {
    fields: [menuCategory.kitchenId],
    references: [kitchenProfile.id],
  }),
  items: many(menuItem),
}));

export const menuItemRelations = relations(menuItem, ({ one }) => ({
  kitchen: one(kitchenProfile, {
    fields: [menuItem.kitchenId],
    references: [kitchenProfile.id],
  }),
  category: one(menuCategory, {
    fields: [menuItem.categoryId],
    references: [menuCategory.id],
  }),
}));
