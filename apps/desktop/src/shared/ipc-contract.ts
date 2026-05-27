import type {
  CreateMapInput,
  CreateMapProjectInput,
  DeleteMapInput,
  MapListItem,
  MapSourceFilePayload,
  MapThumbnailPayload,
  MapWorkspaceState,
  MapsChangedEvent,
  ReplaceMapSourceInput,
  UpdateMapWorkspaceInput,
} from "./maps.types.js";
import type { McpStatus } from "./mcp.types.js";
import type { AppMenuAction, ShowMapContextMenuInput } from "./menu.types.js";
import type {
  BuildTileCacheResult,
  GetMapSectorViewInput,
  MapSectorViewResult,
  MapTileCacheConfig,
  SetTileCacheBoundsInput,
  TileCacheBuildProgressEvent,
} from "./tile-cache.types.js";
import type {
  GetRenderedMapViewResult,
  RenderedMapView,
  WorkspaceCaptureRequestEvent,
  WorkspaceCaptureResponseInput,
} from "./rendered-map-view.types.js";

/**
 * Single source of truth for every IPC channel in the app.
 *
 * Each entry: `'channel-name': { req: RequestType; res: ResponseType }`.
 * Add new channels here — main handlers, preload bridge, and renderer hooks
 * all derive their types from this map, so the TypeScript compiler keeps every
 * layer honest.
 */
export interface IpcContract {
  // --- App meta --------------------------------------------------------------
  "app:getVersion": { req: void; res: string };
  "app:getPlatform": { req: void; res: NodeJS.Platform };
  "app:showMapContextMenu": { req: ShowMapContextMenuInput; res: { ok: true } | { ok: false } };
  "app:hardReload": { req: void; res: { ok: true } | { ok: false } };

  // --- Generic key/value storage (electron-store backend) --------------------
  // Also fulfilled by the sqlite backend via a `kv` table.
  "store:get": { req: { key: string }; res: unknown };
  "store:set": { req: { key: string; value: unknown }; res: { ok: true } };
  "store:delete": { req: { key: string }; res: { ok: true } };
  "store:clear": { req: void; res: { ok: true } };

  // --- Relational DB (better-sqlite3 backend only) ---------------------------
  // Safe, schema-validated query surface. See docs/04-storage.md.
  "db:run": {
    req: { sql: string; params?: unknown[] };
    res: { changes: number; lastInsertRowid: number | bigint };
  };
  "db:all": { req: { sql: string; params?: unknown[] }; res: unknown[] };
  "db:get": { req: { sql: string; params?: unknown[] }; res: unknown };
  "db:ping": { req: void; res: { ok: boolean } };

  // --- Maps (PGlite domain) --------------------------------------------------
  "maps:list": { req: void; res: MapListItem[] };
  "maps:create": { req: CreateMapInput; res: MapListItem };
  "maps:createProject": { req: CreateMapProjectInput; res: MapWorkspaceState };
  "maps:getWorkspace": { req: { mapId: number }; res: MapWorkspaceState | null };
  "maps:readSource": { req: { mapId: number }; res: MapSourceFilePayload | null };
  "maps:updateWorkspace": { req: UpdateMapWorkspaceInput; res: MapWorkspaceState };
  "maps:replaceSource": { req: ReplaceMapSourceInput; res: MapSourceFilePayload };
  "maps:readThumbnail": { req: { mapId: number }; res: MapThumbnailPayload | null };
  "maps:delete": { req: DeleteMapInput; res: { ok: true } };

  // --- Tile cache (local map tiles) ------------------------------------------
  "tileCache:getStatus": { req: { mapId: number }; res: MapTileCacheConfig | null };
  "tileCache:setBoundsFromCorners": { req: SetTileCacheBoundsInput; res: MapTileCacheConfig };
  "tileCache:build": { req: { mapId: number }; res: BuildTileCacheResult };
  "tileCache:getSectorView": { req: GetMapSectorViewInput; res: MapSectorViewResult };

  // --- Workspace snapshots (PDF + map pane capture) -------------------------
  "workspace:captureResponse": { req: WorkspaceCaptureResponseInput; res: { ok: true } };
  "workspace:saveRenderedView": { req: { snapshot: RenderedMapView }; res: { ok: true } };
  "workspace:getRenderedView": { req: { mapId: number }; res: GetRenderedMapViewResult };
  "workspace:requestRenderedView": {
    req: { mapId: number; liveCapture?: boolean };
    res: GetRenderedMapViewResult;
  };

  // --- Local MCP server ------------------------------------------------------
  "mcp:getStatus": { req: void; res: McpStatus };
  "mcp:setEnabled": { req: { enabled: boolean }; res: McpStatus };

  // --- Auto updater ---------------------------------------------------------
  "updater:check": { req: void; res: { updateAvailable: boolean; version?: string } };
  "updater:download": { req: void; res: { ok: true } };
  "updater:quitAndInstall": { req: void; res: { ok: true } };
}

export type IpcChannel = keyof IpcContract;
export type IpcRequest<K extends IpcChannel> = IpcContract[K]["req"];
export type IpcResponse<K extends IpcChannel> = IpcContract[K]["res"];

/**
 * Events pushed from main -> renderer (fire-and-forget, no response).
 */
export interface IpcEventMap {
  "app:menuAction": AppMenuAction;
  "maps:changed": MapsChangedEvent;
  "tileCache:buildProgress": TileCacheBuildProgressEvent;
  "workspace:captureRequest": WorkspaceCaptureRequestEvent;
  "updater:status": {
    state: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    error?: string;
  };
}

export type IpcEventName = keyof IpcEventMap;
export type IpcEventPayload<K extends IpcEventName> = IpcEventMap[K];
