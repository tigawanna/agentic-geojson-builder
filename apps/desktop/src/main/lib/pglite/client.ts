import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import log from "electron-log/main";
import * as schema from "./schema/index.js";
import { getMigrationsFolder, getPgliteDataDir } from "./paths.js";

let pgliteClient: PGlite | null = null;
let db: (PgliteDatabase<typeof schema> & { $client: PGlite }) | null = null;

export type PgliteDb = PgliteDatabase<typeof schema> & { $client: PGlite };

let initPromise: Promise<void> | null = null;

export function initPgliteDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const dataDir = getPgliteDataDir();
      const migrationsFolder = getMigrationsFolder();

      log.info(`[pglite] opening database at ${dataDir}`);

      pgliteClient = new PGlite({
        dataDir,
        extensions: { postgis },
      });
      db = drizzle({ client: pgliteClient, schema });

      await pgliteClient.waitReady;
      await migrate(db, { migrationsFolder });

      const health = await db.execute(sql`select 1 as ok`);
      const mapCount = await db.execute(sql`select count(*)::int as count from map`);

      log.info("[pglite] migrations applied", { migrationsFolder });
      log.info("[pglite] health check passed", {
        ok: health.rows[0],
        mapCount: mapCount.rows[0],
      });
    })().catch((error: unknown) => {
      initPromise = null;
      pgliteClient = null;
      db = null;
      log.error("[pglite] initialization failed", error);
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
