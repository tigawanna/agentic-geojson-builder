# Agent tile cache & map vision — handoff

Prototype for **agent-pannable map vision**: configure a square region on a map, fetch XYZ tiles on demand (or pre-warm to disk), stitch sectors into PNGs for MCP/assistant tools. Integrated into `apps/web` via TanStack server functions — no separate service.

**Status:** Early prototype. Works end-to-end on map 1 (Karura). Expect rough edges.

**Related:** [`map-workspace-features.md`](map-workspace-features.md) · [`agent-digitization-design.md`](agent-digitization-design.md) · [`TODOS.md`](../TODOS.md)

---

## What this feature does

| Capability            | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| **Square bounds**     | User sets center + half-side (km) around the map area agents should explore |
| **On-demand sectors** | `get_map_sector_view(lat, lng)` fetches ~9 tiles, stitches 768×768 PNG      |
| **Optional pre-warm** | Bulk-download tiles z14–17 into disk cache (slow for large areas)           |
| **Local tile route**  | Leaflet can serve cached tiles via `/api/tiles/...` after pre-warm          |
| **Robust georef**     | Affine fit drops outliers >75 m before computing transform                  |

### Vision model (two paths)

1. **Static snapshots** — `get_rendered_map_view` (client-captured PDF + map pane). Manual/chat paste workflow.
2. **Pannable sectors** — `get_map_sector_view` (server-stitched tile sectors). Agent can “look around” inside the square bounds.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MapAlignmentWorkspace (UI)                                  │
│  Controls → square half-side, set bounds, optional pre-warm   │
│  Blue dashed rectangle overlay on Leaflet                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ TanStack server functions
┌──────────────────────────▼──────────────────────────────────┐
│  apps/web/src/data-access-layer/tile-cache/                  │
│  tile-cache.functions.ts  (auth middleware)                  │
│  tile-cache.server.ts     (business logic)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  @repo/tile-cache (packages/tile-cache/)                     │
│  tile-math, fetch-tile, resolve-tile, build-cache, stitch    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
  Postgres `map_tile_cache`          Disk `data/tile-cache/`
  (bounds config only)               (PNG tiles + manifest.json)
```

**Design choice:** Package logic in `@repo/tile-cache` so it can be extracted later (e.g. Electron bundle or standalone worker). Runtime stays in SSR today.

---

## Key paths

| Area               | Path                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| Package            | `packages/tile-cache/src/`                                                      |
| DAL                | `apps/web/src/data-access-layer/tile-cache/`                                    |
| DB schema          | `apps/web/src/lib/drizzle/schema/maps/map-tile-cache.schema.ts`                 |
| Migration          | `apps/web/drizzle/migrations/0005_map_tile_cache.sql`                           |
| MCP tools          | `apps/web/src/features/agentic-tools/geojson-mcp.server.ts`                     |
| oRPC router        | `apps/web/src/features/agentic-tools/geojson-orpc-router.server.ts`             |
| Map assistant tool | `apps/web/src/features/agentic-tools/geojson-agent.server.ts`                   |
| Workspace UI       | `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx` |
| Local tile HTTP    | `apps/web/src/routes/api/tiles/$mapId/$style/$z/$x/$y.png.ts`                   |
| Robust georef      | `apps/web/src/lib/georeference/affine.ts` → `fitAffineTransformRobust`          |
| Disk cache         | `apps/web/data/tile-cache/` (gitignored)                                        |

---

## Disk layout

Base dir: `apps/web/data/tile-cache/` (relative to `process.cwd()` when the web app runs).

```
data/tile-cache/
  map-{mapId}/
    {style}/                 # outline | standard | satellite
      manifest.json
      {z}/{x}/{y}.png
```

Example: `data/tile-cache/map-1/satellite/17/12345/67890.png`

Postgres stores **config only** (center, half-side, zoom range, style, tile count, builtAt) — not tile bytes.

---

## MCP / agent tools

MCP endpoint: `http://localhost:3050/api/mcp` with `x-api-key` header.

| Tool                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `get_tile_cache_status`   | Square bounds + pre-warm status for a map               |
| `set_tile_cache_bounds`   | Set center lat/lng, halfSideMeters, optional zoom/style |
| `build_tile_cache`        | Optional bulk pre-warm (parallel downloads)             |
| `get_map_sector_view`     | Stitch PNG at lat/lng inside bounds                     |
| `get_rendered_map_view`   | Client snapshot (PDF + map pane) — separate vision path |
| `get_map_project_context` | Includes georef with robust inlier stats                |

Map assistant (`/api/ai/map-assistant`) exposes `get_map_sector_view` bound to the active map id.

### Example MCP flow

```bash
# 1. Set square region (or use UI: Controls → Set from map center)
set_tile_cache_bounds { mapId, centerLat, centerLng, halfSideMeters: 2000 }

# 2. Optional pre-warm (skip for most agent work)
build_tile_cache { mapId }

# 3. Inspect a location
get_map_sector_view { mapId, latitude, longitude, zoom: 17, style: "satellite" }
```

Returns PNG as `imageBase64` plus bounds, metersPerPixel, cacheHit, missingTileCount.

---

## UI (Controls modal)

Section: **Agent map region**

- **Square half-side** slider (0.5–10 km)
- **Set from map center** — saves bounds to Postgres
- **Pre-warm cache (optional)** — bulk download; not required for sector views
- **Blue dashed rectangle** on Leaflet shows the configured square
- Status: “Bounds saved · sector views ready on demand” or pre-warm tile count

### Web map vs agent cache

|                | Web map (Leaflet)                             | Agent tools                  |
| -------------- | --------------------------------------------- | ---------------------------- |
| Default        | Live Esri/OSM/Carto tiles                     | On-demand fetch + disk write |
| After pre-warm | Switches to `/api/tiles/...` if style matches | Cache-first, fetch misses    |

On-demand sector fetches **do** write tiles to disk but **do not** switch Leaflet until pre-warm completes (`builtAt` + `tileCount > 0`).

---

## Georeference (robust affine)

Added **`affine-robust`** method: iteratively removes control points whose residual exceeds **75 m** until the inlier set fits (minimum 3 points).

Exposed in UI and MCP:

- `inlierControlPointCount` / `controlPointCount`
- `excludedControlPointIds`
- RMS/max error computed on **inliers only**

**Map 1 result (after fix):** 22/32 inliers, RMS ~36 m (was ~119 m with all points).

Recomputes automatically when stored method is legacy `affine`.

---

## Server functions (UI)

| Function                  | Method |
| ------------------------- | ------ |
| `getMapTileCacheFn`       | GET    |
| `setMapTileCacheBoundsFn` | POST   |
| `buildMapTileCacheFn`     | POST   |
| `getMapSectorViewFn`      | POST   |

Defined in `tile-cache.functions.ts`. Query/mutation options in `tile-cache-query-options.ts`.

---

## How to run locally

```bash
pnpm install
cd apps/web
pnpm db:migrate
pnpm dev   # http://localhost:3050
```

MCP API key: `~/.cursor/mcp.json` → `agentic-geojson-builder` → `x-api-key`.

Test map: **id 1** (Karura Forest PDF, 32 control points).

---

## Known limitations & rough edges

1. **Square bounds only** — no arbitrary polygons yet.
2. **Pre-warm is slow** at large half-sides (~1,500+ tiles for 5 km @ z14–17). On-demand is the intended default.
3. **Tile providers** — Esri satellite, OSM, Carto. Respect rate limits; no retry backoff.
4. **Sector stitch** — composite offsets rounded to integers (sharp requirement). Sub-pixel crop not implemented.
5. **Pre-warm failure** — throws if zero tiles cached; does not set `builtAt` when `tileCount === 0`.
6. **Control points unlabeled** — hard to verify landmark QA; schema supports `label` but UI does not expose it.
7. **Georef** — single affine; PDF skew/non-uniform scale not modeled. Outlier rejection helps but anchor points on gates/roads still matter.
8. **`@repo/tile-cache` standalone typecheck** — relative import extensions fail under package tsconfig (web bundler resolves fine).

---

## Suggested next steps

| Priority | Task                                                        |
| -------- | ----------------------------------------------------------- |
| High     | Control point **labels** in UI (“Gate C”, “Waterfall”)      |
| High     | Highlight excluded georef outliers on map/PDF               |
| Medium   | Pre-warm **progress + cancel** in UI                        |
| Medium   | Use on-demand cached tiles in Leaflet without full pre-warm |
| Medium   | `get_pdf_sector_view` — PDF counterpart for agent panning   |
| Low      | MBTiles export for Electron/offline bundle                  |
| Low      | Polygon bounds (replace square)                             |

---

## Verification checklist

- [ ] Controls → set bounds → blue square appears
- [ ] MCP `get_map_sector_view` returns PNG inside bounds
- [ ] MCP `get_map_sector_view` errors outside bounds
- [ ] Georef shows inlier count + excluded IDs after refresh
- [ ] Pre-warm with tiny area (0.5 km, z16–17) completes in reasonable time
- [ ] `get_rendered_map_view` still works after workspace capture
- [ ] Map assistant calls `get_map_sector_view` successfully

---

## Recent fixes (May 2026)

1. **Sector view crash** — sharp composite `left`/`top` rounded to integers.
2. **False “built” cache** — no `builtAt` when zero tiles; pre-warm throws on total failure.
3. **Georef RMS** — robust outlier rejection (`affine-robust`, 75 m threshold).
4. **On-demand default** — sector views no longer require pre-warm; ~9 tiles per view, parallel fetch.

---

## Dependencies

- `sharp` — tile stitching (`@repo/tile-cache`)
- `@repo/tile-cache` — workspace package (`apps/web/package.json`)
- Leaflet — map display; optional local tile URL override
