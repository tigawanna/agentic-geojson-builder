import { createClient } from "@libsql/client";
import { fileURLToPath } from "node:url";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  `file:${fileURLToPath(new URL("../../.test/db/e2e.sqlite", import.meta.url))}`;

export async function getUserIdByEmail(email: string) {
  const client = createClient({ url: databaseUrl, authToken: "" });
  try {
    const result = await client.execute({
      sql: "select id from user where email = ?",
      args: [email],
    });
    const id = result.rows[0]?.id;
    if (typeof id !== "string") {
      throw new Error(`Could not find test user ${email}`);
    }
    return id;
  } finally {
    client.close();
  }
}
