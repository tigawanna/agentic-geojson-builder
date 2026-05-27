import { BrowserWindow, app } from "electron";
import log from "electron-log/main";
import electronUpdater from "electron-updater";
import type { IpcEventPayload } from "../shared/ipc-contract.js";

// `electron-updater` is published as CJS. `esModuleInterop` gives us the full
// namespace under `default`, so we destructure `autoUpdater` here.
const { autoUpdater } = electronUpdater;

autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;

function emit(payload: IpcEventPayload<"updater:status">): void {
  mainWindow?.webContents.send("updater:status", payload);
}

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  autoUpdater.on("checking-for-update", () => emit({ state: "checking" }));
  autoUpdater.on("update-available", (info) => emit({ state: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => emit({ state: "not-available" }));
  autoUpdater.on("download-progress", (progress) =>
    emit({
      state: "downloading",
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      },
    }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    emit({ state: "downloaded", version: info.version }),
  );
  autoUpdater.on("error", (err) =>
    emit({ state: "error", error: err instanceof Error ? err.message : String(err) }),
  );

  // Automatically check for updates 5s after boot in production builds.
  if (app.isPackaged) {
    setTimeout(() => {
      void autoUpdater
        .checkForUpdates()
        .catch((err) => log.error("[updater] initial check failed", err));
    }, 5_000);
  }
}

export async function checkForUpdates(): Promise<{ updateAvailable: boolean; version?: string }> {
  if (!app.isPackaged) {
    log.info("[updater] skipping check in dev mode");
    return { updateAvailable: false };
  }
  const result = await autoUpdater.checkForUpdates();
  if (!result) return { updateAvailable: false };
  const currentVersion = app.getVersion();
  const updateAvailable = result.updateInfo.version !== currentVersion;
  return { updateAvailable, version: result.updateInfo.version };
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}

export function quitAndInstallUpdate(): void {
  autoUpdater.quitAndInstall();
}
