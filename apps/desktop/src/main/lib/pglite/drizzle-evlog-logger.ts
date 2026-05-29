import type { Logger } from "drizzle-orm/logger";
import { log } from "@main/lib/logger.js";

export class DrizzleEvlogLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    log.debug({
      action: "drizzle",
      message: "query",
      sql: query,
      params,
    });
  }
}
