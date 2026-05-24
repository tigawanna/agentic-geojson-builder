# Building agent map tile tools (local cache + bounding box)

Guide for creating tools that let agents **pan and zoom inside a configured region** by requesting map imagery at a specific **latitude/longitude**, **zoom level**, and **viewport size** — all constrained to a **bounding box** for a map project.

**Related:** [`agent-tile-cache-handoff.md`](agent-tile-cache-handoff.md) (current prototype status) · [`map-workspace-features.md`](map-workspace-features.md)

---

## SQLite or not?

In earlier design discussions we compared two local tile storage options:

| Approach             | Storage                                            | SQLite?                             | Status in this repo   |
| -------------------- | -------------------------------------------------- | ----------------------------------- | --------------------- |
| **XYZ folder cache** | `data/tile-cache/map-{id}/{style}/{z}/{x}/{y}.png` | **No**                              | **Implemented today** |
| **MBTiles archive**  | Single `.mbtiles` file                             | **Yes** (tiles table inside SQLite) | Planned / not built   |

**Postgres** (maps, control points, segments) is unrelated — it stays regardless of tile storage.

### Recommendation (unchanged)

- **Start with XYZ on disk** — simple, debuggable, works with `@repo/tile-cache` today, no extra dependency.
- **Add MBTiles later** only if you need one portable file (Electron bundle, offline handoff, GIS tooling).

You do **not** need SQLite (or MBTiles) to build lat/lng sector tools. The working prototype already serves agents without it.

---

## What the tool does (mental model)

```text
1. Configure a square bounding box around a site (center + half-side in meters)
2. Agent calls a tool with (latitude, longitude, zoom?, width?, height?)
3. Server checks the point is inside the bounding box
4. Server resolves XYZ tiles for a viewport centered on that point
5. Server stitches tiles into one PNG and returns base64 + geographic metadata
```

The agent gets a **zoomed-in pane** (default 768×768 px, ~9 tiles at z17) it can use for vision / digitization — without re-fetching the whole map every time.

---

## Core concepts

### Bounding box (square region)

Defined by **center** + **half-side in meters** (not a free-form polygon yet).

```typescript
// packages/tile-cache/src/tile-math.ts
squareBoundsFromCenter(centerLat, centerLng, halfSideMeters);
// → { north, south, east, west, centerLatitude, centerLongitude, halfSideMeters }
```

Persisted in Postgres table `map_tile_cache` (config only — not tile bytes). See `apps/web/src/lib/drizzle/schema/maps/map-tile-cache.schema.ts`.

### Lat/lng → tile grid (Web Mercator XYZ)

At zoom `z`, the world is a grid of 256×256 px tiles:

```typescript
// Which tiles cover the bounding box at one zoom level (pre-warm)
listTilesForBounds(bounds, z) → [{ z, x, y }, ...]

// Which tiles cover a viewport centered on a point (sector / pane)
tilesForSector(lat, lng, z, width, height) → { tiles, topLeftX, topLeftY, ... }
```

### Sector pane (zoomed view)

A **sector** is a rectangular image centered on `(latitude, longitude)`:

| Parameter | Default                      | Range                                  | Meaning                |
| --------- | ---------------------------- | -------------------------------------- | ---------------------- |
| `zoom`    | map's `maxZoom` (usually 17) | 10–20                                  | Detail level           |
| `width`   | 768                          | 128–2048                               | Output PNG width (px)  |
| `height`  | 768                          | 128–2048                               | Output PNG height (px) |
| `style`   | map cache style              | `outline` \| `standard` \| `satellite` | Tile provider          |

Output includes **geographic bounds of the image** (`north/south/east/west`), `metersPerPixel`, and `imageBase64`.

---

## What exists today

### Package: `@repo/tile-cache`

Location: `packages/tile-cache/src/`

| Module             | Role                                                |
| ------------------ | --------------------------------------------------- |
| `tile-math.ts`     | Bounds, tile indices, sector math                   |
| `tile-url.ts`      | External provider URLs (OSM, Esri, Carto)           |
| `paths.ts`         | Read/write PNG cache on disk                        |
| `fetch-tile.ts`    | HTTP fetch single tile                              |
| `resolve-tile.ts`  | Cache-first: disk → fetch → write-back              |
| `stitch-sector.ts` | Parallel resolve + `sharp` composite → PNG          |
| `build-cache.ts`   | Optional bulk pre-warm for entire bbox × zoom range |

### Server layer

`apps/web/src/data-access-layer/tile-cache/tile-cache.server.ts`

- `setMapTileCacheBoundsForUser` — save bounding box
- `getMapSectorViewForUser` — **main sector/pane request**
- `buildMapTileCacheForUser` — optional pre-warm
- `readCachedTileForUser` — single tile for Leaflet route

### MCP tools (already registered)

Endpoint: `POST /api/mcp` with `x-api-key` header.

| Tool                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `set_tile_cache_bounds` | Configure bbox                     |
| `get_tile_cache_status` | Read bbox + pre-warm status        |
| `build_tile_cache`      | Optional bulk download             |
| `get_map_sector_view`   | **Request zoomed pane at lat/lng** |

Registered in `apps/web/src/features/agentic-tools/geojson-mcp.server.ts`.

---

## End-to-end flow: request a pane inside a bbox

### Step 1 — Set the bounding box

**MCP / oRPC input** (`setTileCacheBoundsToolInputSchema`):

```json
{
  "mapId": 1,
  "centerLat": -1.239,
  "centerLng": 36.843,
  "halfSideMeters": 2000,
  "minZoom": 14,
  "maxZoom": 17,
  "style": "satellite"
}
```

Or in the UI: **Controls → Agent map region → Set from map center**.

This writes Postgres config and computes `SquareBounds`. Pre-warm is **not** required for sector views.

### Step 2 — Request a sector at lat/lng

**Input** (`getMapSectorViewToolInputSchema`):

```json
{
  "mapId": 1,
  "latitude": -1.241,
  "longitude": 36.845,
  "zoom": 17,
  "width": 768,
  "height": 768,
  "style": "satellite"
}
```

**Server checks:**

1. Tile cache configured for `mapId`
2. `(latitude, longitude)` inside `config.bounds` — otherwise error: _"outside the cached square bounds"_

**Server work** (`renderMapSectorFromCache` in `stitch-sector.ts`):

1. `tilesForSector(lat, lng, zoom, width, height)` → list of `{z,x,y}`
2. For each tile: read `data/tile-cache/.../z/x/y.png` or fetch from provider and write to disk
3. Composite into one PNG with `sharp`
4. Return base64 + metadata

**Output** (abbreviated):

```json
{
  "mapId": 1,
  "style": "satellite",
  "center": { "latitude": -1.241, "longitude": 36.845 },
  "zoom": 17,
  "width": 768,
  "height": 768,
  "bounds": { "north": -1.239, "south": -1.243, "east": 36.847, "west": 36.843 },
  "metersPerPixel": 0.6,
  "mimeType": "image/png",
  "imageBase64": "...",
  "cacheHit": false,
  "missingTileCount": 0,
  "attribution": "© Esri — ...",
  "cacheBounds": { "north": ..., "south": ..., "east": ..., "west": ..., ... }
}
```

### Step 3 — Agent pans to another point

Call `get_map_sector_view` again with a different `latitude` / `longitude` **inside the same bbox**. Each call fetches ~9 tiles (at default size/zoom), stitches, returns a new PNG. Previously fetched tiles are reused from disk.

---

## How to add a new tile tool

Follow the same layers as `get_map_sector_view`.

### 1. Add logic in `@repo/tile-cache` (if reusable)

Example: a tool that returns **raw tile bytes** for one `{z,x,y}` instead of a stitched sector.

```typescript
// packages/tile-cache/src/ — use existing exports
import { resolveTileBuffer, listTilesForBounds, squareBoundsFromCenter } from "@repo/tile-cache";
```

Keep provider URLs, tile math, and disk paths in the package — not in MCP handlers.

### 2. Add server function

`apps/web/src/data-access-layer/tile-cache/tile-cache.server.ts`:

```typescript
export async function myTileToolForUser(userId: string, input: MyInput) {
  const config = await getMapTileCacheForUser(userId, input.mapId);
  if (!config) throw new Error("Tile cache is not configured for this map.");

  if (!isPointInSquareBounds(input.latitude, input.longitude, config.bounds)) {
    throw new Error("Requested coordinates are outside the cached square bounds.");
  }

  // call @repo/tile-cache helpers
}
```

Always: **auth** (`assertMapBelongsToUser` / `getMapTileCacheForUser`) + **bbox guard**.

### 3. Expose TanStack server function

`apps/web/src/data-access-layer/tile-cache/tile-cache.functions.ts`:

```typescript
export const myTileToolFn = createServerFn({ method: "POST" })
  .inputValidator(myToolInputSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return myTileToolForUser(userId, data);
  });
```

### 4. Zod schemas

`apps/web/src/features/agentic-tools/geojson-tool-schemas.ts` — define input/output schemas next to existing tile cache schemas.

### 5. oRPC route (optional, for HTTP clients)

`apps/web/src/features/agentic-tools/geojson-orpc-router.server.ts` — add route under `/tile-cache/...`.

### 6. Register MCP tool

`apps/web/src/features/agentic-tools/geojson-mcp.server.ts`:

```typescript
server.registerTool(
  "my_tile_tool",
  {
    title: "My Tile Tool",
    description: "What it does, bbox constraints, lat/lng behavior.",
    inputSchema: myToolInputSchema.shape,
  },
  async (input) => jsonToolResult(await client.tileCache.myTool(input)),
);
```

### 7. Map assistant (optional)

`apps/web/src/features/agentic-tools/geojson-agent.server.ts` — bind tool to active map id for in-app chat.

---

## Disk layout (XYZ cache)

```text
apps/web/data/tile-cache/
  map-{mapId}/
    satellite/          # or outline | standard
      manifest.json
      17/
        12345/
          67890.png
```

Tile path helper: `getTilePath(baseDir, mapId, style, z, x, y)` in `packages/tile-cache/src/paths.ts`.

---

## Optional pre-warm (whole bbox)

For Leaflet to serve local tiles via `GET /api/tiles/{mapId}/{style}/{z}/{x}/{y}.png`, run `build_tile_cache` after setting bounds.

This downloads **all** tiles in the bbox for `minZoom..maxZoom`:

```typescript
for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
  listTilesForBounds(bounds, zoom); // every tile in the square at this zoom
}
```

Rough sizes (PNG, satellite):

| Half-side | Zoom range | Approx tiles | Approx disk |
| --------- | ---------- | ------------ | ----------- |
| 0.5 km    | 16–17      | ~50          | ~5 MB       |
| 2 km      | 14–17      | ~400         | ~40 MB      |
| 5 km      | 14–17      | ~1,500+      | ~150 MB+    |

**Sector views do not require pre-warm** — they fetch on demand (~9 tiles per 768×768 view).

---

## Future: MBTiles (SQLite) variant

If you later want the **SQLite / MBTiles** approach discussed in design:

### What changes

| Layer       | XYZ (today)                        | MBTiles (future)                                                                  |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Tile read   | `readFile(getTilePath(...))`       | `SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?` |
| Tile write  | `writeFile(...)`                   | `INSERT INTO tiles ...`                                                           |
| Export      | Copy folder                        | Single `.mbtiles` file                                                            |
| Package API | Same `resolveTileBuffer` signature | Swap storage adapter behind `paths.ts`                                            |

### MBTiles schema (standard)

```sql
CREATE TABLE tiles (
  zoom_level INTEGER,
  tile_column INTEGER,
  tile_row INTEGER,
  tile_data BLOB
);
CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);
```

Node libraries: `@mapbox/mbtiles`, `better-sqlite3`, or read-only `sql.js` for agents.

### What stays the same

- Bounding box config in Postgres
- `get_map_sector_view` input/output shape
- `tilesForSector` / `listTilesForBounds` math
- MCP tool registration pattern
- Bbox guard: reject lat/lng outside configured region

Implement an `MbtilesTileStore` that implements the same interface as `paths.ts` read/write — then `resolve-tile.ts` and `stitch-sector.ts` stay unchanged.

---

## Example agent workflow (Karura map id 1)

```bash
# 1. Configure 2 km square around forest center
set_tile_cache_bounds {
  "mapId": 1,
  "centerLat": -1.239,
  "centerLng": 36.843,
  "halfSideMeters": 2000,
  "style": "satellite"
}

# 2. Look at a trail junction (no pre-warm needed)
get_map_sector_view {
  "mapId": 1,
  "latitude": -1.241,
  "longitude": 36.845,
  "zoom": 17
}

# 3. Pan 200 m east — still inside bbox
get_map_sector_view {
  "mapId": 1,
  "latitude": -1.241,
  "longitude": 36.847,
  "zoom": 17
}

# 4. Outside bbox → error (by design)
get_map_sector_view {
  "mapId": 1,
  "latitude": -1.30,
  "longitude": 36.90,
  "zoom": 17
}
```

---

## Verification checklist

- [ ] `set_tile_cache_bounds` → status shows `bounds` with expected N/S/E/W
- [ ] `get_map_sector_view` inside bbox → PNG base64, `missingTileCount: 0`
- [ ] Same call outside bbox → clear error
- [ ] Second call near first → `cacheHit: true` (tiles on disk)
- [ ] Optional: `build_tile_cache` → Leaflet uses `/api/tiles/...` after pre-warm

---

## Key files

| Area                  | Path                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| Tile math & stitching | `packages/tile-cache/src/`                                                      |
| Server logic          | `apps/web/src/data-access-layer/tile-cache/tile-cache.server.ts`                |
| Tool schemas          | `apps/web/src/features/agentic-tools/geojson-tool-schemas.ts`                   |
| MCP registration      | `apps/web/src/features/agentic-tools/geojson-mcp.server.ts`                     |
| oRPC routes           | `apps/web/src/features/agentic-tools/geojson-orpc-router.server.ts`             |
| HTTP tile route       | `apps/web/src/routes/api/tiles/$mapId/$style/$z/$x/$y.png.ts`                   |
| UI controls           | `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx` |
| Prototype handoff     | `docs/agent-tile-cache-handoff.md`                                              |
