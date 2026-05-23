# Agentic GeoJSON Builder — running TODOs

Handoff note between work sessions. Update this file when priorities or reality change.

**Implemented UI inventory:** [`docs/map-workspace-features.md`](docs/map-workspace-features.md)  
**Agent digitization design:** [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md)  
**Reference tool architecture:** [`../agentic-json-resume/apps/web/src/features/agentic-tools/`](../agentic-json-resume/apps/web/src/features/agentic-tools/README.md)

---

## Current state (what actually runs today)

### Map workspace (`/maps`)

Browser-only persistence via **PGLite** (IndexedDB + PostGIS extension). No server-side map data yet.

| Area        | Status                                                           |
| ----------- | ---------------------------------------------------------------- |
| Routes      | `/maps` (list), `/maps/new` → `/maps/$id` (workspace)            |
| UI          | Side-by-side PDF + Leaflet map, reference points, controls modal |
| Persistence | PGLite tables `map`, `control_point`                             |
| PDF storage | `map.pdf_data` bytea in IndexedDB                                |
| Auth tie-in | Maps are **not** scoped to signed-in user                        |
| Server DB   | Turso/libSQL — **Better Auth tables only**                       |

Key paths:

- `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx`
- `apps/web/src/routes/_dashboard/maps/new/-components/map-handle.ts`
- `apps/web/src/lib/pglite/` — client, schema, migrations
- `apps/web/src/data-access-layer/pglite/` — TanStack Query options calling PGLite directly in the browser

### Shared contracts (not wired to UI yet)

- `packages/isomorphic/src/geojson-builder.ts` — Zod domain + planned agent tool names
- `packages/isomorphic/src/auth-roles.ts` — `mapProject`, `geoFeature`, etc.

### Agent / MCP

- `/api/mcp` — **missing** (404)
- MCP settings UI — commented out
- No TanStack AI chat route yet
- Legacy resume MCP/oRPC stack preserved under `legacy/apps-web-copied-resume-app/features/agentic-tools/`

### Outdated notes

Older sections of this file referenced `/map-projects` and a Turso-backed GeoJSON data layer. That route **does not exist** in the active app. The live workspace is `/maps` on PGLite. Phase 1 below replaces PGLite with server Postgres — not a client/server sync layer.

---

## Strategic decision

**Do not sync PGLite ↔ remote Postgres.** One source of truth on the server so that:

- MCP clients (Cursor, Claude Desktop, custom cloud agents) read/write the same project state as the web UI
- API keys authenticate against server tools
- Agent runs, feature segments, and exports share one database

Local Postgres is already available. Migrate schemas and queries there; expose them through TanStack Start server functions.

---

## Phase 1 — Migrate PGLite → server Postgres (do this first)

### 1.1 Database setup

- [ ] Switch `apps/web/drizzle.config.ts` from `turso` to **`postgresql`** (or add a dedicated `drizzle.postgres.config.ts` if auth stays on Turso temporarily)
- [ ] Set `DATABASE_URL=postgresql://...` in `apps/web/.env` (see `ARCHITECTURE.md`)
- [ ] Enable **PostGIS** in Postgres (`CREATE EXTENSION postgis`)
- [ ] Add a custom Drizzle migration for the extension (mirror `drizzle-pglite/migrations/0000_extensions.sql`)

### 1.2 Move schema out of PGLite

Port from `/home/dennis/Desktop/code/fullstack/agentic-json-resume/apps/web/src/lib/pglite/schema/` into `apps/web/src/lib/drizzle/scheam/maps/`:

| Table                  | Notes                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `map`                  | Add `owner_id` → `user.id`. Keep workspace columns (viewport, PDF transform, base map style). |
| `control_point`        | Keep `image_x`, `image_y`, PostGIS `location` point SRID 4326                                 |
| (later) `geo_segment`  | Chunked path rows for agent patches                                                           |
| (later) `geo_feature`  | Merged/exportable features per `packages/isomorphic`                                          |
| (later) `georeference` | Affine transform JSON + residual error                                                        |
| (later) `agent_run`    | Tool audit trail                                                                              |

Start minimal: **`map` + `control_point` + `owner_id`** — enough to replace today's PGLite slice.

PDF storage options (pick one in implementation):

- **A.** Postgres `bytea` (matches current PGLite approach, simplest migration)
- **B.** Filesystem under `uploads/maps/{mapId}/` + `pdf_storage_key` column (better for large PDFs)

Generate migrations with `pnpm --filter web db:generate` only — no hand-written SQL unless custom (PostGIS extension).

### 1.3 Server data access layer

Create server-only modules (pattern from json-resume `*.server.ts`):

```
apps/web/src/data-access-layer/maps/
  maps.server.ts           # Drizzle queries, ownership checks
  maps.functions.ts        # createServerFn + viewerMiddleware
  maps-query-options.ts    # TanStack Query → calls *.functions.ts
  maps.types.ts

apps/web/src/data-access-layer/control-points/
  control-points.server.ts
  control-points.functions.ts
  control-points-query-options.ts
  control-points.types.ts
```

Rules:

- `*.server.ts` — `import "@tanstack/react-start/server-only"`, receives `userId`, asserts map ownership
- `*.functions.ts` — session auth via existing `viewerMiddleware`
- UI components **never** import `*.server.ts` directly

Port logic from:

- `apps/web/src/data-access-layer/pglite/maps-query-options.ts`
- `apps/web/src/data-access-layer/pglite/control-points-query-options.ts`

### 1.4 Rewire the UI

- [ ] Remove `PgliteProvider` / `PgliteProviderWrapper` from `apps/web/src/routes/_dashboard/maps/layout.tsx`
- [ ] Update `MapAlignmentWorkspace`, maps list, and `/maps/new` to use server function query options
- [ ] Scope list/create/delete to `context.viewer.user.id`
- [ ] Handle loading/error states (already partially present)

### 1.5 Remove PGLite (after parity)

- [ ] Delete `apps/web/src/lib/pglite/`
- [ ] Delete `apps/web/src/data-access-layer/pglite/`
- [ ] Remove `@electric-sql/pglite`, `@electric-sql/pglite-postgis`, `@proj-airi/drizzle-orm-browser-migrator`, PGLite Vite plugin config
- [ ] Remove `db:pglite:*` scripts from `apps/web/package.json`

### 1.6 Verification checklist

- [ ] Create map while signed in → row has `owner_id`
- [ ] Upload PDF → persists across refresh
- [ ] Control points CRUD + drag on map/PDF
- [ ] Workspace prefs auto-save (viewport, transform, base map style)
- [ ] Second user cannot read another user's map
- [ ] `pnpm --filter web check-types` && `pnpm --filter web build`

---

## Phase 2 — Shared agent tool layer (mirror json-resume)

Replicate the four-layer funnel from `agentic-json-resume/apps/web/src/features/agentic-tools/`:

```
packages/isomorphic (Zod contracts)
        ↓
geojson-tool-schemas.ts          ← input/output Zod for every tool
        ↓
geojson-tools.server.ts          ← single implementation: { userId, input } → result
        ↓
geojson-orpc-router.server.ts    ← procedures + read/write permissions
        ↓
┌─────────────────┬──────────────────────┬─────────────────────────┐
geojson-mcp       /api/agentic/*         geojson-agent.server.ts
(MCP register)    (OpenAPI + RPC)        (TanStack AI .server())
```

Create folder:

```
apps/web/src/features/agentic-tools/
  README.md
  agentic-routes.ts
  geojson-tool-schemas.ts
  geojson-tools.server.ts
  geojson-orpc-base.server.ts
  geojson-orpc-router.server.ts
  geojson-orpc.server.ts
  geojson-orpc-client.server.ts
  geojson-mcp.server.ts
  geojson-agent.server.ts
  geojson-chat-tool-definitions.ts
```

Wire routes:

- `apps/web/src/routes/api/mcp.ts`
- `apps/web/src/routes/api/agentic/$.ts`
- `apps/web/src/routes/api/agentic/rpc/$.ts`
- `apps/web/src/routes/api/agentic/openapi.json.ts`
- `apps/web/src/routes/api/ai/map-assistant.ts` (or similar SSE route)

Auth:

- **UI** — Better Auth session via `viewerMiddleware`
- **MCP / external API** — Better Auth API keys via `apps/web/src/lib/better-auth/api-key.server.ts` (permissions already mention `mapProject`)

Internal trusted callers use `createGeojsonAgenticServerClient(userId)` — in-process oRPC, no HTTP loop.

Re-enable `McpConnectSection` in settings once `/api/mcp` exists.

---

## Tool inventory (shared definitions)

One Zod schema per tool in `geojson-tool-schemas.ts`. One function per tool in `geojson-tools.server.ts`. MCP uses snake_case names; TanStack AI definitions can use the same or scoped variants.

### Server tools — database & deterministic logic

These run only on the server. Safe for MCP, oRPC, and TanStack AI `.server()` handlers.

| Tool name                           | Purpose                                                                                 | Backed by                       |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| `list_maps`                         | Paginated maps for authenticated user                                                   | `maps.server.ts`                |
| `get_map_workspace`                 | Map metadata + workspace prefs + PDF ref                                                | `maps.server.ts`                |
| `create_map`                        | New map project                                                                         | `maps.server.ts`                |
| `update_map_workspace`              | Viewport, transform, base map style, location query                                     | `maps.server.ts`                |
| `delete_map`                        | Delete map + cascade control points                                                     | `maps.server.ts`                |
| `save_map_pdf`                      | Upload/replace PDF binary or storage key                                                | `maps.server.ts`                |
| `list_control_points`               | Control points for a map                                                                | `control-points.server.ts`      |
| `create_control_point`              | PDF pixel ↔ lat/lng pair                                                                | `control-points.server.ts`      |
| `update_control_point`              | Edit or drag-sync a point                                                               | `control-points.server.ts`      |
| `delete_control_point`              | Remove reference point                                                                  | `control-points.server.ts`      |
| `suggest_control_point_adjustments` | Proposed nudges when PDF icon vs satellite misaligned; human or policy confirms         | `control-points.server.ts`      |
| `get_project_context`               | Aggregated JSON: map, control points, georeference status, feature counts, segment gaps | composes several `*.server.ts`  |
| `compute_georeference`              | Affine transform from 3+ control points + residual error                                | new `georeference.server.ts`    |
| `pdf_pixel_to_lon_lat`              | Convert PDF canvas pixel to WGS84 using stored transform                                | `georeference.server.ts`        |
| `lon_lat_to_pdf_pixel`              | Inverse transform for map-side reference work                                           | `georeference.server.ts`        |
| `list_feature_segments`             | Chunked path rows for a map/trail group                                                 | future `geo-segments.server.ts` |
| `find_feature_gaps`                 | Missing links between segments in a `segmentGroupId`                                    | future `geo-segments.server.ts` |
| `apply_feature_patch`               | Upsert segment or feature draft (small GeoJSON patch)                                   | future `geo-segments.server.ts` |
| `validate_geojson_features`         | Turf checks: bounds, length, self-intersection, min vertices                            | pure server util                |
| `verify_georeference_quality`       | Residual error, ready-for-tracing gate                                                  | `georeference.server.ts`        |
| `verify_control_point_alignment`    | Map pin vs transform prediction offset in meters                                        | `georeference.server.ts`        |
| `verify_segment_continuity`         | Gap detection between segments in a group                                               | `geo-segments.server.ts`        |
| `verify_segment_on_pdf`             | Vision + geometry: line follows PDF trail                                               | hybrid (server + snapshot id)   |
| `verify_feature_on_map`             | Vision + geometry: line matches satellite trail                                         | hybrid (server + snapshot id)   |
| `compare_before_after`              | Diff two revisions of a segment                                                         | `geo-segments.server.ts`        |
| `merge_feature_segments`            | Stitch segments by group id + snap endpoints                                            | future                          |
| `export_geojson`                    | Build FeatureCollection from accepted features                                          | future                          |
| `explain_feature`                   | Return feature metadata + provenance for agent/human                                    | future                          |
| `record_agent_run`                  | Audit log for tool calls                                                                | future `agent-runs.server.ts`   |

### Client tools — browser-only (TanStack AI)

These need DOM, canvas, or clipboard. Implement via `toolDefinition().client()` or post-tool React effects (json-resume uses effects for refresh).

| Tool name                   | Purpose                                                                   | Notes                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `get_rendered_map_view`     | PNG snapshots of PDF pane + map viewport with bounds/canvas metadata      | Client capture; [coordinate contract](docs/agent-digitization-design.md#required-metadata-agent-coordinate-contract) |
| `get_verification_snapshot` | Fresh capture after writes, with overlays (refs, drafts) for verify tools | Client; returns `snapshotId` for server verify\_\* calls                                                             |
| `refresh_map_workspace`     | Invalidate TanStack Query keys after agent writes                         | Hook watching completed tool parts                                                                                   |
| `set_map_viewport`          | Pan/zoom base map                                                         | Wraps `map-handle.ts` `setViewport`                                                                                  |
| `pan_map_to_query`          | Nominatim search from chat                                                | Wraps `map-handle.ts` `panToQuery`                                                                                   |

### Hybrid / orchestration

| Tool name                       | Purpose                                | Notes                                                                                                        |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `propose_features_from_overlay` | Vision model traces paths on snapshots | Client captures images → server sends to model → server calls `apply_feature_patch` with pixel or geo coords |

Agent constraint (from `GAMEPLAN.md`): writes create **`draft`** rows only until human accept.

Full chunking strategy, coordinate spaces, **vision vs JSON vs tools**, agent coordinate contract, verification loop, and merge pipeline: **[`docs/agent-digitization-design.md`](docs/agent-digitization-design.md)**.

---

## Agent digitization — summary (see design doc for detail)

Agents see **PDF + satellite snapshots** plus **`get_project_context` JSON**. They trace **one trail or segment per turn** via `apply_feature_patch`; humans review, drag vertices, and nudge reference points when misaligned.

| Strategy              | When to use                                                |
| --------------------- | ---------------------------------------------------------- |
| One feature per trail | Karura colored loops — first default                       |
| `geo_segment` rows    | Long paths split into ordered chunks with `segmentGroupId` |
| Anchor + span         | Sparse corner points; app densifies between                |
| Spatial tiles         | Very large maps only — not needed for Karura v1            |

Do **not** sync or return whole-map GeoJSON in one agent response. Merge + simplify on accept/export (Turf).

Planned reference-point agent behavior: propose small adjustments via `update_control_point` or `suggest_control_point_adjustments`; re-run `compute_georeference` after changes.

---

## Phase 3 — Product features (after Postgres + tools)

Ordered by dependency. Design rationale: [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md).

- [ ] **Affine georeference** — `compute_georeference` + `pdf_pixel_to_lon_lat` / `lon_lat_to_pdf_pixel` + UI residual error display
- [ ] **Implement `get_rendered_map_view` metadata contract** — canvas size, map bounds, coordinate spaces (see design doc)
- [ ] **`geo_segment` table** — chunked patches with `segmentGroupId`, `segmentIndex`, `status`, `coordinateSpace`
- [ ] **`find_feature_gaps` + merge pipeline** — snap endpoints, concatenate, Turf validate/simplify on accept
- [ ] **Agent vision loop** — `get_rendered_map_view` (PNG + metadata) → `propose_features_from_overlay` (pdf-pixels) → `apply_feature_patch` → server convert via `pdf_pixel_to_lon_lat`
- [ ] **Reference point agent assist** — suggest/adjust misaligned control points; recompute transform after edits
- [ ] **Trace mode** — manual LineString draw on map using transform from control points
- [ ] **In-app agent chat** — TanStack AI tab on map workspace, OpenRouter key from client
- [ ] **GeoJSON export** — accepted merged features only
- [ ] **Multi-page PDF** — beyond page 1 render
- [ ] **Align naming with isomorphic** — optional rename `map` → `map_project`, routes `/maps` → `/map-projects`, string ids

---

## Phase 4 — MCP & external agents

- [ ] Register server tools on `McpServer` in `geojson-mcp.server.ts`
- [ ] Streamable HTTP at `/api/mcp` with API key auth
- [ ] Document MCP setup in settings (re-enable `McpConnectSection`)
- [ ] OpenAPI spec at `/api/agentic/openapi/json` for non-MCP integrations

---

## Covered ground (UI — do not re-build)

See [`docs/map-workspace-features.md`](docs/map-workspace-features.md). Summary:

- Side-by-side PDF + Leaflet workspace
- PDF upload, zoom/pan/rotate, control point markers on PDF
- Reference point workflow (map click, paste Google Maps coords, PDF click)
- Draggable control points on map and PDF
- Double-click / cursor readout coordinate copy
- Base maps: satellite (default), outline, standard
- Nominatim location search
- Controls modal (reference list, edit/delete, map area, PDF sliders)
- PGLite persistence + debounced workspace auto-save
- `map-handle.ts` imperative map API

---

## Known cleanup debt

- `apps/web/.env` contains local secrets — do not commit
- `TODOS.md` previously described `/map-projects` Turso work that was never merged; Phase 1 supersedes that path
- `legacy/` is archived reference only
- Better Auth organization plugin uses GeoJSON role names without full access-control wiring yet

---

## Quick reference — file mapping (json-resume → geojson)

| json-resume                                 | geojson-builder (target)                  |
| ------------------------------------------- | ----------------------------------------- |
| `resume-tool-schemas.ts`                    | `geojson-tool-schemas.ts`                 |
| `resume-tools.server.ts`                    | `geojson-tools.server.ts`                 |
| `resume-orpc-router.server.ts`              | `geojson-orpc-router.server.ts`           |
| `resume-mcp.server.ts`                      | `geojson-mcp.server.ts`                   |
| `resume-agent.server.ts`                    | `geojson-agent.server.ts`                 |
| `resume-chat-tool-definitions.ts`           | `geojson-chat-tool-definitions.ts`        |
| `data-access-layer/resume/resume.server.ts` | `data-access-layer/maps/maps.server.ts`   |
| `routes/api/mcp.ts`                         | `routes/api/mcp.ts` (create)              |
| `routes/api/ai/resume-tailor.ts`            | `routes/api/ai/map-assistant.ts` (create) |
