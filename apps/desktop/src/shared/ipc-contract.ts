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
  "updater:status": {
    state: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    error?: string;
  };
}

export type IpcEventName = keyof IpcEventMap;
export type IpcEventPayload<K extends IpcEventName> = IpcEventMap[K];
