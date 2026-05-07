import { envVariables } from "../env";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";

const connectionString = envVariables.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const db = drizzle(connectionString, {
  schema,
});
