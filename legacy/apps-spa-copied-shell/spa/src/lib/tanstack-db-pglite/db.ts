import { postgis } from "@electric-sql/pglite-postgis";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createCollection } from "@tanstack/react-db";
import { drizzleCollectionOptions } from "tanstack-db-pglite";

export const pgliteClient = new PGlite({
  extensions: { postgis },
});



export const db = drizzle({ client: pgliteClient });
