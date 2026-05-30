import { BrowserWindow } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const windowsByMapId = new Map<number, BrowserWindow>();

function buildSourceDocumentUrl(mapId: number): string {
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    return `${devUrl.replace(/\/$/, "")}/maps/${mapId}/source`;
  }
  const indexHtml = join(__dirname, "../../renderer/index.html");
  return `file://${indexHtml}#/maps/${mapId}/source`;
}

export function isSourceDocumentWindowOpen(mapId: number): boolean {
  const existing = windowsByMapId.get(mapId);
  return Boolean(existing && !existing.isDestroyed());
}

export function openSourceDocumentWindow(mapId: number, parent: BrowserWindow | null): boolean {
  const existing = windowsByMapId.get(mapId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return true;
  }

  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 360,
    title: "Source document",
    show: false,
    autoHideMenuBar: true,
    parent: parent ?? undefined,
    backgroundColor: "#121613",
    webPreferences: {
      preload: join(__dirname, "../../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  windowsByMapId.set(mapId, win);

  win.on("ready-to-show", () => win.show());
  win.on("closed", () => {
    windowsByMapId.delete(mapId);
    broadcastToRenderers("workspace:sourceDocumentWindowClosed", { mapId });
  });

  void win.loadURL(buildSourceDocumentUrl(mapId));
  return true;
}

export function closeSourceDocumentWindow(mapId: number): boolean {
  const existing = windowsByMapId.get(mapId);
  if (!existing || existing.isDestroyed()) {
    return false;
  }
  existing.close();
  return true;
}
