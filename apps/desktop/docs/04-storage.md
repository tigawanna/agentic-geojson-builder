# Storage

At scaffold time, the CLI asked whether you wanted `electron-store` or
`better-sqlite3`. The chosen backend is wired into
[`src/main/storage/index.ts`](../src/main/storage/index.ts) and exposed over
IPC via the `store:*` (and, for SQLite, `db:*`) channels.

## electron-store (key/value JSON)

- **File**: `~/Library/Application Support/desktop/app-settings.json` (macOS)
  / `%APPDATA%\desktop\app-settings.json` (Windows) / `~/.config/desktop/app-settings.json` (Linux).
- **Good for**: user settings, window bounds, feature flags, small caches.
- **Bad for**: anything that needs querying or tens of thousands of rows.

Schema lives in [`src/main/storage/backend-store.ts`](../src/main/storage/backend-store.ts).
Extend the `AppSettings` interface to add top-level keys:

```typescript
export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: string;
  kv: Record<string, unknown>;
  // add your new keys here
  recentFiles: string[];
}
```

## better-sqlite3 (relational)

- **File**: `app.getPath('userData')/app.db` (same directory as above).
- **Good for**: lots of structured data, full-text search, anything needing SQL.
- **Bad for**: sharing the DB across multiple running app instances (SQLite is
  file-level-locked; WAL mode helps but isn't magic).

### Migrations

Edit [`src/main/storage/migrations.ts`](../src/main/storage/migrations.ts) and
append to the `migrations` array:

```typescript
{
  id: 2,
  name: 'add-tags',
  up: (db) => {
    db.exec(`
      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );
    `)
  },
},
```

Migrations run inside a transaction on app boot; `_migrations` tracks what's
already been applied.

### Querying from the renderer

The `db:all` / `db:get` / `db:run` channels expose a generic, **zod-validated**
surface:

```typescript
const { data } = useIpcQuery("db:all", {
  sql: "SELECT id, title FROM notes ORDER BY created_at DESC LIMIT ?",
  params: [25],
});
```

The main side (see
[`src/main/storage/backend-sqlite.ts`](../src/main/storage/backend-sqlite.ts))
validates that the SQL starts with `SELECT / INSERT / UPDATE / DELETE / WITH`
and uses prepared statements with parameter binding — no string concat, no
ad-hoc DDL from the renderer.

For anything more complex (schema changes, bulk imports, transactions), add a
**dedicated IPC channel** with a zod-validated payload instead of using the
generic surface.

### Native rebuild

`better-sqlite3` is a native module. `electron-builder install-app-deps` runs
in `postinstall` and rebuilds it against Electron's Node ABI. If you ever see
`NODE_MODULE_VERSION mismatch`, run that command by hand.

## Switching backends later

1. Edit [`src/main/storage/backend.ts`](../src/main/storage/backend.ts) to
   `export { backend } from './backend-sqlite.js'` (or vice versa).
2. Add/remove the dependency in `package.json`:
   - electron-store: `npm i electron-store`
   - sqlite: `npm i better-sqlite3 zod && npm i -D @electron/rebuild`
3. Run `npm i` — `install-app-deps` will rebuild as needed.

The IPC contract stays identical, so renderer code doesn't change.
