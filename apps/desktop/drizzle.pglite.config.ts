import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-pglite/migrations",
  schema: "./src/main/lib/pglite/schema/**/*.ts",
  dialect: "postgresql",
  driver: "pglite",
  extensionsFilters: ["postgis"],
  dbCredentials: {
    url: "memory://desktop-pglite",
  },
});
