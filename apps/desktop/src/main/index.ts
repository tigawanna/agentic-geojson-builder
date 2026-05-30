import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerIpcHandlers } from "@main/ipc/index.js";
import { initPgliteDb, shutdownPgliteDb } from "@main/lib/pglite/client.js";
import { initAppLogger, log } from "@main/lib/logger.js";
import { createApplicationMenu } from "@main/menu/create-application-menu.js";
import { initMcpServer, shutdownMcpServer } from "@main/mcp/index.js";
import { startTileServer, stopTileServer } from "@main/tile-server.js";
import { initUpdater } from "@main/updater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Agentic GeoJSON Builder",
    show: false,
    autoHideMenuBar: process.platform !== "darwin",
    backgroundColor: "#0a0a0a",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      // electron-vite emits the preload as ESM (`.mjs`) because `package.json`
      // declares `"type": "module"`. Electron ≥28 supports ESM preload scripts
      // natively when the file extension is `.mjs`.
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

void app.whenReady().then(async () => {
  initAppLogger();
  log.info({
    action: "app",
    message: "starting desktop",
    version: app.getVersion(),
  });

  await initPgliteDb();
  registerIpcHandlers();
  createApplicationMenu();
  await startTileServer();
  await initMcpServer();

  mainWindow = createWindow();

  initUpdater(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void shutdownPgliteDb();
  void shutdownMcpServer();
  void stopTileServer();
});

process.on("uncaughtException", (err) => {
  log.error({
    action: "app",
    message: "uncaught exception",
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
});
