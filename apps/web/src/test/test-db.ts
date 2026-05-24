import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { vi } from "vitest";

export type TestDatabase = {
  databaseUrl: string;
  cleanup: () => Promise<void>;
};

async function runPostgresMigrations(client: pg.Client) {
  const migrationDir = fileURLToPath(new URL("../../drizzle/migrations/", import.meta.url));
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const migration = readFileSync(`${migrationDir}/${file}`, "utf8");
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await client.query(statement);
    }
  }
}

export async function createMigratedTestDatabase(): Promise<TestDatabase> {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for test database setup.");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await runPostgresMigrations(client);
  } finally {
    await client.end();
  }

  return {
    databaseUrl,
    cleanup: async () => {},
  };
}

export function stubTestServerEnv(databaseUrl: string, frontendUrl = "http://127.0.0.1:3040") {
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("DATABASE_AUTH_TOKEN", "");
  vi.stubEnv("BETTER_AUTH_SECRET", "vitest-test-secret-at-least-32-characters");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("FRONTEND_URL", frontendUrl);
  vi.stubEnv("VITE_API_URL", frontendUrl);
}
