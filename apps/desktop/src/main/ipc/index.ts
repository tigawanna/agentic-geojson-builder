import { app, BrowserWindow, ipcMain } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { log } from "@main/lib/logger.js";
import { appMenuHandlers } from "@main/ipc/app-menu.js";
import { storageHandlers } from "@main/ipc/storage.js";
import { mapsHandlers } from "@main/ipc/maps.js";
import { tileCacheHandlers } from "@main/ipc/tile-cache.js";
import { controlPointsHandlers } from "@main/ipc/control-points.js";
import { geoSegmentsHandlers } from "@main/ipc/geo-segments.js";
import { referenceGeoJsonHandlers } from "@main/ipc/reference-geojson.js";
import { mcpSettingsHandlers } from "@main/ipc/mcp-settings.js";
import { workspaceSnapshotHandlers } from "@main/ipc/workspace-snapshot.js";
import { pgliteHandlers } from "@main/ipc/pglite.js";
import { dataBackupHandlers } from "@main/ipc/data-backup.js";
import { playgroundHandlers } from "@main/ipc/playground.js";
import { updaterHandlers } from "@main/ipc/updater.js";
import { referenceSnapHandlers } from "@main/ipc/reference-snap.js";
import { workspaceLayoutHandlers } from "@main/ipc/workspace-layout.js";
import { windowChromeHandlers } from "@main/ipc/window-chrome.js";
import { openSourceDocumentWindow } from "@main/workspace/source-document-window.js";
import { listAuditLog } from "@main/lib/pglite/audit-log.service.js";

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
function shouldLogIpcChannel(channel: IpcChannel) {
  return channel.startsWith("geoSegments:") || channel.startsWith("referenceSnap:");
}

function register<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, async (_event, req: IpcRequest<K>) => {
    const startedAt = Date.now();
    const observability = shouldLogIpcChannel(channel);
    if (observability) {
      log.info({
        action: "ipc",
        message: "handler started",
        channel,
        request: req,
      });
    }
    try {
      const result = await handler(req);
      if (observability) {
        log.info({
          action: "ipc",
          message: "handler completed",
          channel,
          durationMs: Date.now() - startedAt,
        });
      }
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
    ...dataBackupHandlers,
    ...mapsHandlers,
    ...tileCacheHandlers,
    ...workspaceSnapshotHandlers,
    ...controlPointsHandlers,
    ...geoSegmentsHandlers,
    ...mcpSettingsHandlers,
    ...referenceSnapHandlers,
    ...workspaceLayoutHandlers,
    ...updaterHandlers,
    "auditLog:list": async (req) => {
      const result = await listAuditLog({
        mapId: req.mapId,
        entityType: req.entityType as "control_point" | "geo_segment" | "map" | undefined,
        entityId: req.entityId,
        action: req.action as "create" | "update" | "delete" | undefined,
        source: req.source,
        search: req.search,
        limit: req.limit,
        offset: req.offset,
      });
      return {
        entries: result.entries.map((e) => ({
          id: e.id,
          mapId: e.mapId,
          mapName: e.mapName,
          entityType: e.entityType,
          entityId: e.entityId,
          action: e.action,
          oldValue: e.oldValue,
          newValue: e.newValue,
          source: e.source,
          createdAt: e.createdAt.toISOString(),
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      };
    },
  };

  for (const [channel, handler] of Object.entries(handlers) as [
    IpcChannel,
    Handler<IpcChannel>,
  ][]) {
    if (handler) register(channel, handler);
  }

  register("workspace:openSourceDocumentWindow", (req) => {
    openSourceDocumentWindow(req.mapId);
    return { open: true };
  });

  for (const [channel, handler] of Object.entries({
    ...appMenuHandlers,
    ...playgroundHandlers,
    ...referenceGeoJsonHandlers,
    ...windowChromeHandlers,
  }) as [
    IpcChannel,
    (req: IpcRequest<IpcChannel>, window: BrowserWindow | null) => IpcResponse<IpcChannel>,
  ][]) {
    if (handler) registerWithWindow(channel, handler);
  }

  log.info({
    action: "ipc",
    message: "registered channels",
    count:
      Object.keys(handlers).length +
      Object.keys(appMenuHandlers).length +
      Object.keys(playgroundHandlers).length +
      Object.keys(referenceGeoJsonHandlers).length,
  });
}
