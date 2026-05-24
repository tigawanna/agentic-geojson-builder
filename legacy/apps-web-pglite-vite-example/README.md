# Web PGlite + Vite Example

This is a preserved copy of `apps/web` from before the server Postgres migration.

It keeps the browser PGlite setup for reference:

- `vite.config.ts` wires `@proj-airi/unplugin-drizzle-orm-migrations`.
- `drizzle-pglite/` contains the PGlite Drizzle config and generated migrations.
- `src/lib/pglite/` contains the PGlite client, provider, and schema.
- `src/data-access-layer/pglite/` contains the browser-side map/control point query options.

The `dev` and `check-types` scripts were intentionally removed so this archived example is not picked up by broad workspace task runs if it is ever added back to a package glob.
