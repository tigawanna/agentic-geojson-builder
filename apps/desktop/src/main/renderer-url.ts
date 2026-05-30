import { dirname, join } from "node:path";
import { getPreloadPath } from "@main/preload-path.js";

function normalizeHashPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildRendererHashUrl(hashPath: string): string {
  const normalized = normalizeHashPath(hashPath);
  const devUrl = process.env["ELECTRON_RENDERER_URL"];

  if (devUrl) {
    return `${devUrl.replace(/\/$/, "")}/#${normalized}`;
  }

  const indexHtml = join(dirname(getPreloadPath()), "../renderer/index.html");
  return `file://${indexHtml}#${normalized}`;
}
