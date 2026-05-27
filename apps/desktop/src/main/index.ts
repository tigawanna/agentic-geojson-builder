import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import log from "electron-log/main";
import { registerIpcHandlers } from "./ipc/index.js";
import { initUpdater } from "./updater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

log.initialize();
log.transports.file.level = "info";
log.info(`Starting desktop v${app.getVersion()}`);

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
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
    shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!app.isPackaged && devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

app.whenReady().then(async () => {
  registerIpcHandlers();

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

process.on("uncaughtException", (err) => {
  log.error("Uncaught exception:", err);
});
