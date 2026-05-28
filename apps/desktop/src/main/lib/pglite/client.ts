import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { log } from "../logger.js";
import * as schema from "./schema/index.js";
import { getMigrationsFolder, getPgliteDataDir } from "./paths.js";
import { removeStalePostmasterPid } from "./prepare-data-dir.js";

let pgliteClient: PGlite | null = null;
let db: (PgliteDatabase<typeof schema> & { $client: PGlite }) | null = null;

export type PgliteDb = PgliteDatabase<typeof schema> & { $client: PGlite };

let initPromise: Promise<void> | null = null;

export function initPgliteDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const dataDir = getPgliteDataDir();
      const migrationsFolder = getMigrationsFolder();

      const removedStalePid = removeStalePostmasterPid(dataDir);

      log.info({
        action: "pglite",
        message: "opening database",
        dataDir,
        removedStalePid,
      });

      pgliteClient = new PGlite({
        dataDir,
        extensions: { postgis },
      });
      db = drizzle({ client: pgliteClient, schema });

      await pgliteClient.waitReady;
      await migrate(db, { migrationsFolder });

      const health = await db.execute(sql`select 1 as ok`);
      const mapCount = await db.execute(sql`select count(*)::int as count from map`);

      log.info({
        action: "pglite",
        message: "migrations applied",
        migrationsFolder,
      });
      log.info({
        action: "pglite",
        message: "health check passed",
        ok: health.rows[0],
        mapCount: mapCount.rows[0],
      });
    })().catch((error: unknown) => {
      initPromise = null;
      pgliteClient = null;
      db = null;
      log.error({
        action: "pglite",
        message: "initialization failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
  }

  return initPromise;
}

export function getPgliteDb(): PgliteDb {
  if (!db) {
    throw new Error("PGlite has not been initialized. Call initPgliteDb() during app startup.");
  }
  return db;
}

export function getPgliteClient(): PGlite {
  if (!pgliteClient) {
    throw new Error("PGlite has not been initialized. Call initPgliteDb() during app startup.");
  }
  return pgliteClient;
}

export async function shutdownPgliteDb(): Promise<void> {
  if (!pgliteClient) return;

  const client = pgliteClient;
  pgliteClient = null;
  db = null;
  initPromise = null;

  await client.close();
}
