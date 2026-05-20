import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { live } from "@electric-sql/pglite/live";
import { migrate } from "@proj-airi/drizzle-orm-browser-migrator/pglite";
import { drizzle } from "drizzle-orm/pglite";
import migrations from "virtual:drizzle-migrations.sql";
import * as schema from "./schema/index.schema";

export const pgliteClient = new PGlite({
  dataDir: "idb://my-pgdata",
  extensions: { postgis, live },
});

export const db = drizzle({ client: pgliteClient, schema });

export type PgliteDb = typeof db;

let initPromise: Promise<void> | null = null;

export function initPgliteDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pgliteClient.waitReady;
      await migrate(db, migrations);
    })();
  }
  return initPromise;
}
