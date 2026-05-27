import { app, ipcMain } from "electron";
import log from "electron-log/main";
import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import { storageHandlers } from "./storage.js";
import { updaterHandlers } from "./updater.js";

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
      log.error(`[ipc] ${channel} failed:`, err);
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
    ...updaterHandlers,
  };

  for (const [channel, handler] of Object.entries(handlers) as [
    IpcChannel,
    Handler<IpcChannel>,
  ][]) {
    if (handler) register(channel, handler);
  }

  log.info(`[ipc] registered ${Object.keys(handlers).length} channels`);
}
