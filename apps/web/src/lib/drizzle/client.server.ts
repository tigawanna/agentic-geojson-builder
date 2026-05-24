import "@tanstack/react-start/server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { serverEnv } from "../server-env";
import * as tablesSchema from "./schema/index";

export const db = drizzle(serverEnv.DATABASE_URL, { schema: tablesSchema });
