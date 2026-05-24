# Technical architecture - Agentic GeoJSON Builder

## Product

**Agentic GeoJSON Builder** is a web app for converting map images and PDFs into georeferenced, editable GeoJSON. The app should let people trace paths manually, let agents propose draft features, and keep both workflows pointed at the same validated project state.

The codebase is a **pnpm + Turbo** monorepo with **Vite+** tooling and **`apps/web`** as the main **TanStack Start** app (TanStack Router, TanStack Query, SSR-capable React). Older copied app shells are preserved under `legacy/` and ignored by TypeScript and Vite+ checks.

Branding and copy live in `apps/web/src/utils/system.tsx` (`AppConfig`).

---

## Repository layout

| Path         | Role                                                           |
| ------------ | -------------------------------------------------------------- |
| `apps/web`   | TanStack Start app: UI, auth, map workspace, server data layer |
| `docs/`      | Feature inventory, agent design, handoff docs                  |
| `legacy/`    | Archived copied app/schema code; excluded from active checks   |
| `packages/*` | Shared libraries, types, configs                               |
| Root         | `package.json` scripts, Turbo pipeline, Vite+ CLI (`vp`)       |

---

## Data layer (current)

Single **PostgreSQL** database with PostGIS. Better Auth and map workspace share `DATABASE_URL`.

| Table                              | Purpose                                             |
| ---------------------------------- | --------------------------------------------------- |
| Auth tables (`user`, `session`, …) | Better Auth                                         |
| `map`                              | Map project: workspace prefs, PDF bytea, `owner_id` |
| `control_point`                    | Georeferencing pairs (PDF pixels ↔ WGS84)           |

Access pattern:

```
UI (React Query)
  → *-query-options.ts
  → *.functions.ts (createServerFn + session middleware)
  → *.server.ts (Drizzle + ownership checks)
  → lib/drizzle/client.server.ts
```

Schema: `apps/web/src/lib/drizzle/schema/`  
Migrations: `apps/web/drizzle/migrations/` (`db:generate`, `db:migrate`)

**Not in DB yet:** `georeference`, `geo_segment`, `geo_feature`, `agent_run`

**Removed:** browser PGLite (was IndexedDB-only; removed so MCP/agents share server state). May return for Electron offline later.

---

## Frontend

- **TanStack Router** - File-based routes under `src/routes/`; `routeTree.gen.ts` is generated.
- **TanStack Query** - Data fetching via server functions.
- **Styling** - Tailwind CSS v4, shadcn-style UI, DaisyUI theme tokens where needed.
- **Auth** - Better Auth; dashboard routes protected via `viewerMiddleware` / `beforeLoad`.

### Live routes

- `/maps` — list (paginated, user-scoped)
- `/maps/new` — create map, redirect to `/maps/$id`
- `/maps/$id` — alignment workspace (`MapAlignmentWorkspace`)

### Planned product modules

- **Georeferencing** — affine transform from control points (next)
- **Map editor** — trace LineString/Polygon features
- **Agent review loop** — draft segments, human accept
- **Export** — GeoJSON FeatureCollection

See [`docs/map-workspace-features.md`](docs/map-workspace-features.md) for implemented UI detail.

---

## Agent / MCP (planned)

Thin adapters over the same server logic as the UI. Design: [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md). Checklist: [`TODOS.md`](TODOS.md) Phase 2–4.

Reference implementation: `legacy/apps-web-copied-resume-app/features/agentic-tools/` and external [`agentic-json-resume`](../agentic-json-resume/apps/web/src/features/agentic-tools/).

---

## Tooling

- **`vp`** - Install, dev, build, lint, format, test where supported.
- Keep server-only code in `*.server.ts` and inside TanStack Start server function handlers.
- Dynamic `import()` of `*.server.ts` inside `createServerFn` handlers to satisfy import protection.

---

## Environment

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/agentic_geojson_builder
# Better Auth, GitHub OAuth, FRONTEND_URL — see apps/web/.env
```

---

## Documentation

| Doc                                                                      | Contents                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| [`TODOS.md`](TODOS.md)                                                   | Phased checklist, tool inventory, what's next       |
| [`docs/map-workspace-features.md`](docs/map-workspace-features.md)       | Implemented UI features                             |
| [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md) | Agent chunking, vision vs coordinates, verification |
| [`GAMEPLAN.md`](GAMEPLAN.md)                                             | Product workflow and modules                        |
| [`VISION.md`](VISION.md)                                                 | Problem statement and vision                        |

---

## Further reading

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
