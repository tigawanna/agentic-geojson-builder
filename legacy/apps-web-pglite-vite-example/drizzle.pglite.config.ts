import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-pglite/migrations",
  schema: "./src/lib/pglite/schema/**/*.ts",
  dialect: "postgresql",
  driver: "pglite",
  extensionsFilters: ["postgis"],
  dbCredentials: {
    url: "idb://my-pgdata",
  },
});
