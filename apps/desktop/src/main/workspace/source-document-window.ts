import { BrowserWindow } from "electron";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { getPreloadPath } from "@main/preload-path.js";
import { buildRendererHashUrl } from "@main/renderer-url.js";

const windowsByMapId = new Map<number, BrowserWindow>();

function buildSourceDocumentUrl(mapId: number): string {
  return buildRendererHashUrl(`/maps/${mapId}/source`);
}

export function isSourceDocumentWindowOpen(mapId: number): boolean {
  const existing = windowsByMapId.get(mapId);
  return Boolean(existing && !existing.isDestroyed());
}

export function openSourceDocumentWindow(mapId: number): boolean {
  const existing = windowsByMapId.get(mapId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return true;
  }

  const useFramelessLinuxChrome = process.platform === "linux";

  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 360,
    title: "Source document",
    show: false,
    frame: !useFramelessLinuxChrome,
    autoHideMenuBar: !useFramelessLinuxChrome,
    minimizable: true,
    maximizable: true,
    resizable: true,
    closable: true,
    backgroundColor: "#121613",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (useFramelessLinuxChrome) {
    win.setMenu(null);
  }

  windowsByMapId.set(mapId, win);

  win.on("ready-to-show", () => {
    if (useFramelessLinuxChrome) {
      win.setMinimizable(true);
      win.setMaximizable(true);
    }
    win.show();
  });
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

export function closeAllSourceDocumentWindows(): void {
  for (const win of windowsByMapId.values()) {
    if (!win.isDestroyed()) {
      win.close();
    }
  }
}
