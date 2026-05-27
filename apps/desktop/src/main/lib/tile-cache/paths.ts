import { app } from "electron";
import { join } from "node:path";

export function getTileCacheBaseDir(): string {
  return join(app.getPath("userData"), "tile-cache");
}
