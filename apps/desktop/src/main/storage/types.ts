/**
 * Contract every storage backend must implement.
 *
 * All storage backends must implement the key/value surface (used by `store:*`
 * IPC channels). The relational `run` / `all` / `getRow` methods are optional;
 * when the electron-store backend is in use they are omitted and the `db:*`
 * IPC channels return no-op responses (see ipc/storage.ts).
 */
export interface StorageBackend {
  // Key/value surface — required on every backend.
  get(key: string): unknown | Promise<unknown>;
  set(key: string, value: unknown): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;

  // Relational surface — present only on the sqlite backend.
  run?(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  all?(sql: string, params?: unknown[]): unknown[];
  getRow?(sql: string, params?: unknown[]): unknown;
}
