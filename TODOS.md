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

| Area          | Status                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Routes        | `/maps` (list), `/maps/new` → `/maps/$id` (workspace)                                              |
| UI            | Side-by-side PDF + Leaflet, reference points, trace mode, controls + assistant modals              |
| Persistence   | Postgres tables `map`, `control_point`, `georeference`, `geo_segment`                              |
| PDF storage   | `map.pdf_data` bytea in Postgres                                                                   |
| Auth          | Maps scoped to signed-in user via `owner_id`                                                       |
| Server access | `createServerFn` in `data-access-layer/maps/`, `control-points/`, `georeference/`, `geo-segments/` |
| Build         | `pnpm --filter web check-types` and `pnpm --filter web build` pass                                 |

Key paths:

- `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx`
- `apps/web/src/routes/_dashboard/maps/new/-components/MapAiPanel.tsx`
- `apps/web/src/routes/_dashboard/maps/new/-components/map-handle.ts`
- `apps/web/src/lib/drizzle/schema/maps/` — Drizzle schema
- `apps/web/src/lib/geojson/export-segments.ts` — segment → FeatureCollection
- `apps/web/src/data-access-layer/geo-segments/` — trail segment CRUD + export
- `apps/web/src/features/agentic-tools/` — MCP, oRPC, in-app agent

**Karura test data:** map id `1` with 32 control points for `denniskinuthiaw@gmail.com` (re-upload PDF in UI if `pdf_data` is empty).

### Agent / MCP / in-app chat

- `/api/mcp` — **live** (API key auth, **18 tools**)
- `/api/agentic/*` — OpenAPI HTTP routes
- `/api/agentic/rpc/*` — typed oRPC
- `/api/agentic/openapi/json` — OpenAPI spec
- `/api/ai/map-assistant` — **live** (session auth, TanStack AI SSE)
- MCP settings UI — **enabled** in Settings
- In-app **Assistant** button on map workspace (requires `OPENROUTER_API_KEY` in server env)

### Shared contracts

- `packages/isomorphic/src/geojson-builder.ts` — Zod domain + planned agent tool names
- `packages/isomorphic/src/auth-roles.ts` — `mapProject`, `geoFeature`, etc.

### Historical notes (do not revive)

- `/map-projects` route never shipped in the active app; live route is **`/maps`**
- PGLite was removed intentionally — do **not** sync browser DB ↔ server
- PGLite may return later for an **Electron offline** client; server Postgres remains authoritative for MCP/agents

---

## Strategic decision

**One source of truth on server Postgres** so MCP clients, in-app UI, and agents share the same project state. API keys authenticate external tools; session auth protects the UI and in-app assistant.

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
- [x] `geo_segment` table + migration `0003_legal_molly_hayes.sql`
- [ ] (later) `geo_feature`, `agent_run`

Schema path: `apps/web/src/lib/drizzle/schema/maps/`

PDF storage: **bytea in Postgres** (option A). Large-file filesystem storage deferred.

### 1.3 Server data access layer

- [x] `data-access-layer/maps/`
- [x] `data-access-layer/control-points/`
- [x] `data-access-layer/georeference/`
- [x] `data-access-layer/geo-segments/` — list, create, update, delete, export
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
- [x] Manual smoke test: trace → save → export GeoJSON loop
- [ ] Manual smoke test: create map → `owner_id` populated
- [ ] Manual smoke test: workspace prefs auto-save
- [ ] Manual smoke test: second user cannot access another user's map
- [ ] Manual smoke test: in-app Assistant with `OPENROUTER_API_KEY` set

---

## Phase 2 — Shared agent tool layer ✅ complete

- [x] `features/agentic-tools/` — schemas, tools, oRPC router, MCP server
- [x] `/api/mcp` streamable HTTP + API key auth (18 tools)
- [x] `/api/agentic/*`, `/api/agentic/rpc/*`, `/api/agentic/openapi/json`
- [x] Re-enable `McpConnectSection` in settings
- [x] In-app agent chat — `routes/api/ai/map-assistant.ts` + `MapAiPanel.tsx` + `geojson-agent.server.ts`

---

## Tool inventory

Legend: **UI** = `createServerFn` · **Agent** = MCP + oRPC registered

### Maps & control points

| Tool name                           | Purpose                                   | UI                           | Agent |
| ----------------------------------- | ----------------------------------------- | ---------------------------- | ----- |
| `list_maps`                         | Paginated maps for user                   | Yes (`listMapsFn`)           | Yes   |
| `get_map_workspace`                 | Map metadata + workspace prefs            | Yes (`getMapWorkspaceFn`)    | Yes   |
| `create_map`                        | New map                                   | Yes (`createMapFn`)          | Yes   |
| `update_map_workspace`              | Viewport, transform, base map style       | Yes (`updateMapWorkspaceFn`) | Yes   |
| `delete_map`                        | Delete map + cascade                      | Yes (`deleteMapFn`)          | Yes   |
| `save_map_pdf`                      | Upload/replace PDF bytea                  | Yes (`saveMapPdfFn`)         | Yes   |
| `load_map_pdf`                      | Download PDF for client `File`            | Yes (`loadMapPdfFn`)         | Yes   |
| `list_control_points`               | Control points for a map                  | Yes (`listControlPointsFn`)  | Yes   |
| `create_control_point`              | PDF pixel ↔ lat/lng pair                  | Yes (`createControlPointFn`) | Yes   |
| `update_control_point`              | Edit or drag-sync a point                 | Yes (`updateControlPointFn`) | Yes   |
| `delete_control_point`              | Remove reference point                    | Yes (`deleteControlPointFn`) | Yes   |
| `suggest_control_point_adjustments` | Proposed nudges from overlay vs satellite | —                            | —     |

### Georeference

| Tool name              | Purpose                           | UI                            | Agent |
| ---------------------- | --------------------------------- | ----------------------------- | ----- |
| `get_project_context`  | Aggregated JSON for agent context | —                             | Yes   |
| `compute_georeference` | Affine from 3+ control points     | Yes (`computeGeoreferenceFn`) | Yes   |
| `pdf_pixel_to_lon_lat` | PDF pixel → WGS84                 | Yes (`pdfPixelToLonLatFn`)    | Yes   |
| `lon_lat_to_pdf_pixel` | Inverse transform                 | Yes (`lonLatToPdfPixelFn`)    | Yes   |

### Trail segments & export

| Tool name                   | Purpose                        | UI                               | Agent |
| --------------------------- | ------------------------------ | -------------------------------- | ----- |
| `list_feature_segments`     | Chunked path rows              | Yes (`listGeoSegmentsFn`)        | Yes   |
| `apply_feature_patch`       | Upsert/delete segment draft    | Yes (via create/update/delete)   | Yes   |
| `export_geojson`            | FeatureCollection export       | Yes (`exportGeoJsonFn` + button) | Yes   |
| `find_feature_gaps`         | Missing links between segments | —                                | —     |
| `merge_feature_segments`    | Stitch segments on accept      | —                                | —     |
| `validate_geojson_features` | Turf validation                | —                                | —     |
| `explain_feature`           | Feature provenance             | —                                | —     |
| `record_agent_run`          | Tool audit trail               | —                                | —     |

### In-app assistant tools (map-scoped wrappers)

These are exposed to TanStack AI in `geojson-agent.server.ts` (not separate MCP registrations):

| Tool name                 | Backing agent API       |
| ------------------------- | ----------------------- |
| `get_map_project_context` | `get_project_context`   |
| `list_trail_segments`     | `list_feature_segments` |
| `export_map_geojson`      | `export_geojson`        |
| `apply_trail_patch`       | `apply_feature_patch`   |

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

## Phase 3 — Product features

### Done ✅

- [x] **Affine georeference** — compute + transform tools + Controls panel status
- [x] **`geo_segment` table** — chunked trail patches in Postgres
- [x] **Trace mode** — Ctrl+click vertices, drag to adjust, edit saved trails, pan while tracing
- [x] **GeoJSON export** — header button + `export_geojson` agent tool
- [x] **In-app agent chat** — TanStack AI + OpenRouter + Assistant modal
- [x] **Controls UX** — map search / PDF adjust controls pinned to top of modal

### Next (recommended order)

1. [ ] **`get_rendered_map_view`** — PDF + map PNG capture + metadata contract (unblocks vision)
2. [ ] **Agent vision loop** — snapshot → propose → `apply_feature_patch` → verify
3. [ ] **`merge_feature_segments`** — stitch same-group segments on export or accept
4. [ ] **Accept/reject workflow** — segment status UI (draft → accepted) before export filter
5. [ ] **`find_feature_gaps`** — Turf gap detection between segment endpoints
6. [ ] **Reference point agent assist** — `suggest_control_point_adjustments`
7. [ ] **Assistant ↔ workspace sync** — invalidate TanStack Query after agent patch tools
8. [ ] **Multi-page PDF**
9. [ ] **Align naming with isomorphic** — optional `map` → `map_project`, `/maps` → `/map-projects`

### Later

- [ ] Verification tool suite (`verify_*` in design doc)
- [ ] `geo_feature` merged-geometry cache table
- [ ] `agent_run` audit trail
- [ ] PDF-side trace mode (draw on PDF, convert via georeference)
- [ ] Sync `docs/map-workspace-features.md` and `docs/agent-digitization-design.md` status tables

---

## Phase 4 — MCP & external agents ✅

- [x] `geojson-mcp.server.ts` tool registration (18 tools)
- [x] `/api/mcp` streamable HTTP + API key auth
- [x] Re-enable `McpConnectSection`
- [x] `/api/agentic/openapi/json`
- [ ] Docs polish — OpenAPI examples, Cursor MCP install notes in repo docs

---

## Covered ground (UI — do not re-build)

See [`docs/map-workspace-features.md`](docs/map-workspace-features.md) (may lag code — update when convenient).

- Side-by-side PDF + Leaflet workspace
- Postgres persistence + debounced workspace auto-save + `owner_id` scoping
- PDF upload, zoom/pan/rotate, reference markers
- Reference workflow (Ctrl+click map/PDF, Google Maps paste, drag refs)
- Georeference status in Controls (RMS / max error)
- Trace mode (Ctrl+click, draggable vertices, edit saved segments)
- Trail segments list in Controls (edit / delete)
- Export GeoJSON header button
- In-app Assistant modal (OpenRouter)
- Base maps, Nominatim search, controls modal (map tools at top)
- `map-handle.ts` imperative map API

---

## Known cleanup debt

- `apps/web/.env` contains local secrets — do not commit; add `OPENROUTER_API_KEY` locally for Assistant
- `legacy/` archived reference only
- Better Auth organization plugin uses GeoJSON role names without full access-control wiring
- Electron/PGLite offline mode — future; not started
- Design docs (`agent-digitization-design.md`, `GAMEPLAN.md`, `ARCHITECTURE.md`) still describe some features as "not built" — sync when doing doc pass

---

## Quick reference — file mapping (json-resume → geojson)

| json-resume                                 | geojson-builder                                  |
| ------------------------------------------- | ------------------------------------------------ |
| `resume-tool-schemas.ts`                    | `geojson-tool-schemas.ts` **done**               |
| `resume-tools.server.ts`                    | `geojson-tools.server.ts` **done**               |
| `resume-orpc-router.server.ts`              | `geojson-orpc-router.server.ts` **done**         |
| `resume-mcp.server.ts`                      | `geojson-mcp.server.ts` **done**                 |
| `resume-agent.server.ts`                    | `geojson-agent.server.ts` **done**               |
| `data-access-layer/resume/resume.server.ts` | `data-access-layer/maps/maps.server.ts` **done** |
| `routes/api/mcp.ts`                         | `routes/api/mcp.ts` **done**                     |
| `routes/api/ai/resume-tailor.ts`            | `routes/api/ai/map-assistant.ts` **done**        |
| `ResumeAiTab.tsx`                           | `MapAiPanel.tsx` **done**                        |
