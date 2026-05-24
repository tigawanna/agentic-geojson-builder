# Agentic GeoJSON Builder — running TODOs

Handoff note between work sessions. Update this file when priorities or reality change.

## Documentation index

| Doc                                                                      | Purpose                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`docs/map-workspace-features.md`](docs/map-workspace-features.md)       | What the UI does today (implemented features)                         |
| [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md) | Agent/MCP design: chunking, vision vs coordinates, verification tools |
| [`TODOS.md`](TODOS.md)                                                   | Phased checklist and tool inventory (this file)                       |
| [`GAMEPLAN.md`](GAMEPLAN.md)                                             | Product modules and workflow                                          |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                     | Stack and repo layout                                                 |
| [`VISION.md`](VISION.md)                                                 | Product vision                                                        |

Reference tool architecture (external): [`../agentic-json-resume/apps/web/src/features/agentic-tools/`](../agentic-json-resume/apps/web/src/features/agentic-tools/README.md)

---

## Current state (what actually runs today)

### Map workspace (`/maps`)

**Server Postgres** is the single source of truth. PGLite has been removed from the active app.

| Area          | Status                                                              |
| ------------- | ------------------------------------------------------------------- |
| Routes        | `/maps` (list), `/maps/new` → `/maps/$id` (workspace)               |
| UI            | Side-by-side PDF + Leaflet map, reference points, controls modal    |
| Persistence   | Postgres tables `map`, `control_point` (PostGIS)                    |
| PDF storage   | `map.pdf_data` bytea in Postgres                                    |
| Auth          | Maps scoped to signed-in user via `owner_id`                        |
| Server access | `createServerFn` in `data-access-layer/maps/` and `control-points/` |
| Build         | `pnpm --filter web check-types` and `pnpm --filter web build` pass  |

Key paths:

- `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx`
- `apps/web/src/routes/_dashboard/maps/new/-components/map-handle.ts`
- `apps/web/src/lib/drizzle/schema/maps/` — Drizzle schema
- `apps/web/src/lib/drizzle/client.server.ts` — Postgres client
- `apps/web/src/data-access-layer/maps/` — maps server layer
- `apps/web/src/data-access-layer/control-points/` — control points server layer
- `apps/web/scripts/import-data-stash.mjs` — recover stashed PGLite query data into Postgres

**Karura test data:** map id `1` with 32 control points imported for `denniskinuthiaw@gmail.com` (re-upload PDF in UI if `pdf_data` is empty).

### Shared contracts (not wired to agent layer yet)

- `packages/isomorphic/src/geojson-builder.ts` — Zod domain + planned agent tool names
- `packages/isomorphic/src/auth-roles.ts` — `mapProject`, `geoFeature`, etc.

### Agent / MCP

- `/api/mcp` — **missing** (404)
- MCP settings UI — commented out
- No TanStack AI chat route yet
- No `features/agentic-tools/` folder yet
- Legacy resume MCP/oRPC stack preserved under `legacy/apps-web-copied-resume-app/features/agentic-tools/`

### Historical notes (do not revive)

- `/map-projects` route never shipped in the active app; live route is **`/maps`**
- PGLite was removed intentionally — do **not** sync browser DB ↔ server
- PGLite may return later for an **Electron offline** client; server Postgres remains authoritative for MCP/agents

---

## Strategic decision

**One source of truth on server Postgres** so MCP clients, in-app UI, and future agents share the same project state. API keys authenticate external tools; session auth protects the UI.

---

## Phase 1 — Postgres foundation ✅ complete (verify in browser)

### 1.1 Database setup

- [x] `drizzle.config.ts` uses **postgresql** dialect
- [x] `DATABASE_URL` in `apps/web/.env`
- [x] PostGIS migration file (`drizzle/migrations/0000_extensions.sql`)
- [ ] Confirm PostGIS enabled on your local DB (`CREATE EXTENSION IF NOT EXISTS postgis`)

### 1.2 Schema

- [x] `map` with `owner_id`, workspace prefs, PDF bytea
- [x] `control_point` with PostGIS point geometry
- [x] Better Auth tables in same Postgres database
- [x] `georeference` table + affine compute + transform server fns
- [ ] (later) `geo_segment`, `geo_feature`, `agent_run`

Schema path: `apps/web/src/lib/drizzle/schema/maps/`

PDF storage: **bytea in Postgres** (option A). Large-file filesystem storage deferred.

### 1.3 Server data access layer

- [x] `data-access-layer/maps/` — `maps.server.ts`, `maps.functions.ts`, `maps-query-options.ts`, `maps.types.ts`
- [x] `data-access-layer/control-points/` — same pattern
- [x] Ownership checks via `assertMapBelongsToUser`

### 1.4 UI rewire

- [x] PGLite provider removed from maps layout
- [x] `MapAlignmentWorkspace`, maps list, `/maps/new` use server functions
- [x] List/create/delete scoped to signed-in user

### 1.5 PGLite removal

- [x] Deleted `lib/pglite/`, `data-access-layer/pglite/`, `drizzle-pglite/`
- [x] Removed PGLite npm deps, vite plugin, `db:pglite:*` scripts

### 1.6 Verification checklist

- [x] `pnpm --filter web check-types` && `pnpm --filter web build`
- [x] Karura stash imported (map 1, 32 control points, `owner_id` set)
- [x] Manual smoke test: upload PDF → persists across refresh
- [x] Manual smoke test: control points CRUD + drag on map/PDF (Karura map 1, 32 points)
- [ ] Manual smoke test: create map → `owner_id` populated
- [ ] Manual smoke test: workspace prefs auto-save
- [ ] Manual smoke test: second user cannot access another user's map

---

## Phase 2 — Shared agent tool layer (next priority)

Wrap existing server logic in `features/agentic-tools/` (mirror json-resume):

```
packages/isomorphic (Zod contracts)
        ↓
geojson-tool-schemas.ts
        ↓
geojson-tools.server.ts          ← delegates to maps.* / control-points.* / georeference.*
        ↓
geojson-orpc-router.server.ts
        ↓
┌─────────────────┬──────────────────────┬─────────────────────────┐
geojson-mcp       /api/agentic/*         geojson-agent.server.ts
```

Create folder: `apps/web/src/features/agentic-tools/` (see json-resume reference)

Wire routes:

- `apps/web/src/routes/api/mcp.ts`
- `apps/web/src/routes/api/agentic/$.ts`
- `apps/web/src/routes/api/agentic/rpc/$.ts`
- `apps/web/src/routes/api/agentic/openapi.json.ts`
- `apps/web/src/routes/api/ai/map-assistant.ts`

Re-enable `McpConnectSection` in settings once `/api/mcp` exists.

---

## Tool inventory

Legend: **UI** = exposed via `createServerFn` today · **Agent** = MCP/TanStack AI registration (planned) · **—** = not built

### Maps & control points

| Tool name                           | Purpose                                   | UI                           | Agent |
| ----------------------------------- | ----------------------------------------- | ---------------------------- | ----- |
| `list_maps`                         | Paginated maps for user                   | Yes (`listMapsFn`)           | —     |
| `get_map_workspace`                 | Map metadata + workspace prefs            | Yes (`getMapWorkspaceFn`)    | —     |
| `create_map`                        | New map                                   | Yes (`createMapFn`)          | —     |
| `update_map_workspace`              | Viewport, transform, base map style       | Yes (`updateMapWorkspaceFn`) | —     |
| `delete_map`                        | Delete map + cascade control points       | Yes (`deleteMapFn`)          | —     |
| `save_map_pdf`                      | Upload/replace PDF bytea                  | Yes (`saveMapPdfFn`)         | —     |
| `load_map_pdf`                      | Download PDF for client `File`            | Yes (`loadMapPdfFn`)         | —     |
| `list_control_points`               | Control points for a map                  | Yes (`listControlPointsFn`)  | —     |
| `create_control_point`              | PDF pixel ↔ lat/lng pair                  | Yes (`createControlPointFn`) | —     |
| `update_control_point`              | Edit or drag-sync a point                 | Yes (`updateControlPointFn`) | —     |
| `delete_control_point`              | Remove reference point                    | Yes (`deleteControlPointFn`) | —     |
| `suggest_control_point_adjustments` | Proposed nudges from overlay vs satellite | —                            | —     |

### Georeference & features (planned)

| Tool name                   | Purpose                           | UI                            | Agent |
| --------------------------- | --------------------------------- | ----------------------------- | ----- |
| `get_project_context`       | Aggregated JSON for agent context | —                             | —     |
| `compute_georeference`      | Affine from 3+ control points     | Yes (`computeGeoreferenceFn`) | —     |
| `pdf_pixel_to_lon_lat`      | PDF pixel → WGS84                 | Yes (`pdfPixelToLonLatFn`)    | —     |
| `lon_lat_to_pdf_pixel`      | Inverse transform                 | Yes (`lonLatToPdfPixelFn`)    | —     |
| `list_feature_segments`     | Chunked path rows                 | —                             | —     |
| `find_feature_gaps`         | Missing links between segments    | —                             | —     |
| `apply_feature_patch`       | Upsert segment draft              | —                             | —     |
| `validate_geojson_features` | Turf validation                   | —                             | —     |
| `merge_feature_segments`    | Stitch segments on accept         | —                             | —     |
| `export_geojson`            | FeatureCollection export          | —                             | —     |
| `explain_feature`           | Feature provenance                | —                             | —     |
| `record_agent_run`          | Tool audit trail                  | —                             | —     |

### Verification tools (spec in design doc)

| Tool name                        | Purpose                        | UI  | Agent |
| -------------------------------- | ------------------------------ | --- | ----- |
| `verify_georeference_quality`    | Residual error gate            | —   | —     |
| `verify_control_point_alignment` | Pin vs transform offset        | —   | —     |
| `verify_segment_continuity`      | Segment gap detection          | —   | —     |
| `verify_segment_on_pdf`          | Vision + geometry on PDF       | —   | —     |
| `verify_feature_on_map`          | Vision + geometry on satellite | —   | —     |
| `compare_before_after`           | Revision diff                  | —   | —     |

### Client tools (browser)

| Tool name                   | Purpose                       | Status |
| --------------------------- | ----------------------------- | ------ |
| `get_rendered_map_view`     | PDF + map PNGs + metadata     | —      |
| `get_verification_snapshot` | Post-write capture for verify | —      |
| `refresh_map_workspace`     | Invalidate TanStack Query     | —      |
| `set_map_viewport`          | Pan/zoom via `map-handle.ts`  | —      |
| `pan_map_to_query`          | Nominatim from chat           | —      |

### Hybrid

| Tool name                       | Purpose                        | Status |
| ------------------------------- | ------------------------------ | ------ |
| `propose_features_from_overlay` | Vision → `apply_feature_patch` | —      |

Agent constraint: writes create **`draft`** rows only until human accept.

Design detail: [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md)

---

## Phase 3 — Product features (after Phase 2 kickoff)

- [x] **Affine georeference** — `compute_georeference` + transform tools + UI residual error
- [ ] **`get_rendered_map_view` metadata contract** — see design doc
- [ ] **`geo_segment` table** — chunked patches
- [ ] **`find_feature_gaps` + merge pipeline** — Turf on accept
- [ ] **Agent vision loop** — snapshot → propose → patch → convert
- [ ] **Reference point agent assist** — suggest/adjust misaligned pins
- [ ] **Trace mode** — manual LineString on map
- [ ] **In-app agent chat** — TanStack AI + OpenRouter
- [ ] **GeoJSON export**
- [ ] **Multi-page PDF**
- [ ] **Align naming with isomorphic** — optional `map` → `map_project`, `/maps` → `/map-projects`

---

## Phase 4 — MCP & external agents

- [ ] `geojson-mcp.server.ts` tool registration
- [ ] `/api/mcp` streamable HTTP + API key auth
- [ ] Re-enable `McpConnectSection`
- [ ] `/api/agentic/openapi/json`

---

## Covered ground (UI — do not re-build)

See [`docs/map-workspace-features.md`](docs/map-workspace-features.md).

- Side-by-side PDF + Leaflet workspace
- Postgres persistence + debounced workspace auto-save + `owner_id` scoping
- PDF upload, zoom/pan/rotate, reference markers
- Reference workflow (map click, Google Maps paste, PDF click)
- Draggable control points, double-click copy, cursor readout
- Base maps, Nominatim search, controls modal
- `map-handle.ts` imperative map API

---

## Known cleanup debt

- `apps/web/.env` contains local secrets — do not commit
- `legacy/` archived reference only
- Better Auth organization plugin uses GeoJSON role names without full access-control wiring
- Electron/PGLite offline mode — future; not started

---

## Quick reference — file mapping (json-resume → geojson)

| json-resume                                 | geojson-builder                                  |
| ------------------------------------------- | ------------------------------------------------ |
| `resume-tool-schemas.ts`                    | `geojson-tool-schemas.ts` (create)               |
| `resume-tools.server.ts`                    | `geojson-tools.server.ts` (create)               |
| `resume-orpc-router.server.ts`              | `geojson-orpc-router.server.ts` (create)         |
| `resume-mcp.server.ts`                      | `geojson-mcp.server.ts` (create)                 |
| `resume-agent.server.ts`                    | `geojson-agent.server.ts` (create)               |
| `data-access-layer/resume/resume.server.ts` | `data-access-layer/maps/maps.server.ts` **done** |
| `routes/api/mcp.ts`                         | `routes/api/mcp.ts` (create)                     |
| `routes/api/ai/resume-tailor.ts`            | `routes/api/ai/map-assistant.ts` (create)        |
