import { app, BrowserWindow, ipcMain } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { log } from "@main/lib/logger.js";
import { appMenuHandlers } from "@main/ipc/app-menu.js";
import { storageHandlers } from "@main/ipc/storage.js";
import { mapsHandlers } from "@main/ipc/maps.js";
import { tileCacheHandlers } from "@main/ipc/tile-cache.js";
import { controlPointsHandlers } from "@main/ipc/control-points.js";
import { mcpSettingsHandlers } from "@main/ipc/mcp-settings.js";
import { workspaceSnapshotHandlers } from "@main/ipc/workspace-snapshot.js";
import { pgliteHandlers } from "@main/ipc/pglite.js";
import { updaterHandlers } from "@main/ipc/updater.js";

/**
 * Strongly-typed IPC handler definition.
 * The compiler enforces that the returned value matches the contract for each channel.
 */
type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

type HandlerMap = { [K in IpcChannel]?: Handler<K> };

/**
 * Register a single handler with runtime logging and consistent error shape.
 */
function register<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, async (_event, req: IpcRequest<K>) => {
    try {
      const result = await handler(req);
      return result;
    } catch (err) {
      log.error({
        action: "ipc",
        message: "handler failed",
        channel,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}

function registerWithWindow<K extends IpcChannel>(
  channel: K,
  handler: (
    req: IpcRequest<K>,
    window: BrowserWindow | null,
  ) => IpcResponse<K> | Promise<IpcResponse<K>>,
): void {
  ipcMain.handle(channel, async (event, req: IpcRequest<K>) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await handler(req, window);
      return result;
    } catch (err) {
      log.error({
        action: "ipc",
        message: "handler failed",
        channel,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}

/**
 * Aggregate all handlers and register them. Called once at app-ready.
 */
export function registerIpcHandlers(): void {
  const handlers: HandlerMap = {
    "app:getVersion": () => app.getVersion(),
    "app:getPlatform": () => process.platform,
    ...storageHandlers,
    ...pgliteHandlers,
    ...mapsHandlers,
    ...tileCacheHandlers,
    ...workspaceSnapshotHandlers,
    ...controlPointsHandlers,
    ...mcpSettingsHandlers,
    ...updaterHandlers,
  };

  for (const [channel, handler] of Object.entries(handlers) as [
    IpcChannel,
    Handler<IpcChannel>,
  ][]) {
    if (handler) register(channel, handler);
  }

  for (const [channel, handler] of Object.entries(appMenuHandlers) as [
    IpcChannel,
    (req: IpcRequest<IpcChannel>, window: BrowserWindow | null) => IpcResponse<IpcChannel>,
  ][]) {
    if (handler) registerWithWindow(channel, handler);
  }

  log.info({
    action: "ipc",
    message: "registered channels",
    count: Object.keys(handlers).length + Object.keys(appMenuHandlers).length,
  });
}
