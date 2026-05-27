import { app } from "electron";
import { join } from "node:path";

export function getPgliteDataDir(): string {
  return join(app.getPath("userData"), "pglite");
}

export function getMigrationsFolder(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "drizzle-pglite", "migrations");
  }

  return join(app.getAppPath(), "drizzle-pglite", "migrations");
}
