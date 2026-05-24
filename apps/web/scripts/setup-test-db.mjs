import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const appDir = fileURLToPath(new URL("../", import.meta.url));
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const resetDatabase = process.env.TEST_DB_RESET !== "false";

function readMigrationStatements() {
  const migrationDir = join(appDir, "drizzle", "migrations");
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .flatMap((file) => {
      const migration = readFileSync(join(migrationDir, file), "utf8");
      return migration
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);
    });
}

if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for setup-test-db.");
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  if (resetDatabase) {
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
  }

  for (const statement of readMigrationStatements()) {
    await client.query(statement);
  }

  console.log(`Prepared test database at ${databaseUrl}`);
} finally {
  await client.end();
}
