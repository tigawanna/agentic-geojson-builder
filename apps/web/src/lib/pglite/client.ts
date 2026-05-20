import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { live } from "@electric-sql/pglite/live";
import { drizzle } from "drizzle-orm/pglite";

export const pgliteClient = new PGlite({
  database: "idb://my-pgdata",
  extensions: { postgis, live },
});

export const db = drizzle({ client: pgliteClient });
