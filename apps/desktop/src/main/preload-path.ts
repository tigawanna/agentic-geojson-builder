import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getPreloadPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../preload/index.mjs");
}
