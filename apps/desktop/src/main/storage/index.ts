/**
 * Unified storage facade.
 *
 * The CLI scaffolder swaps the `backend` implementation at project creation time:
 *   - `electron-store` → ./backend-store.ts (simple key/value, JSON on disk)
 *   - `better-sqlite3` → ./backend-sqlite.ts (relational, with a `kv` table for
 *     key/value parity so `store:*` IPC channels work on both backends)
 *
 * The currently-installed backend is re-exported as `storage`. If you switch,
 * update the import below and keep the `StorageBackend` interface in sync.
 */
import { backend } from "./backend.js";
import type { StorageBackend } from "./types.js";

export const storage: StorageBackend = backend;
export type { StorageBackend } from "./types.js";
