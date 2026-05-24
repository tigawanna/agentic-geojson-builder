import pg from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

export async function getUserIdByEmail(email: string) {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for e2e database helpers.");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const result = await client.query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [email]);
    const id = result.rows[0]?.id;
    if (typeof id !== "string") {
      throw new Error(`Could not find test user ${email}`);
    }
    return id;
  } finally {
    await client.end();
  }
}
