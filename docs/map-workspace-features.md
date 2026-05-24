# Map workspace — implemented features

Living inventory of what exists today in the map alignment workflow. Use this when writing user-facing documentation later.

**Related docs:** [`docs/README.md`](README.md) · [`TODOS.md`](../TODOS.md) · [`agent-digitization-design.md`](agent-digitization-design.md)

**Primary UI:** `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx`  
**Map imperative API:** `apps/web/src/routes/_dashboard/maps/new/-components/map-handle.ts`  
**Route:** `/maps/$id` (creating a map via `/maps/new` redirects to a new id)

---

## Maps list

- Paginated map list at `/maps` with keyword search (`sq`) and cursor pagination.
- Empty state with link to create a new map.
- Delete map from the list.
- Each map row links to its workspace and shows the uploaded PDF file name when present.
- List scoped to the signed-in user (`owner_id`).

---

## Map creation and persistence

- `/maps/new` creates an untitled map record in **server Postgres** and redirects to `/maps/$id`.
- Workspace state is persisted per map record:
  - Location search query text
  - Base map style (`satellite`, `outline`, `standard`)
  - PDF view transform (scale, rotation, pan X/Y)
  - PDF page count
  - Map viewport (center lat/lng, zoom)
- PDF binary stored in Postgres (`map.pdf_data` bytea) with file name and page count.
- Debounced auto-save (800 ms) of workspace preferences after hydration.
- PDF reloads from Postgres when reopening a map that already has a PDF.

---

## Layout

- Side-by-side workspace: **Source PDF** (left) and **Base map** (right).
- Full-height layout below the dashboard header.
- Panel labels on each side (`Source PDF`, `Base map`).
- Header actions: upload PDF, toggle reference mode, open controls modal.

---

## PDF upload and preview

- Upload a single PDF via header button (accepts `application/pdf` only).
- Renders **page 1** with PDF.js onto a canvas at 1.5× scale.
- Shows file name and page count in the header.
- Loading state while rendering.
- Error display for invalid files or render failures.

### PDF navigation (view transform)

- **Scroll wheel** zooms toward the pointer (scale clamped 0.25×–5×).
- **Drag** pans the PDF (grab cursor).
- **Rotation** slider in controls modal (−180° to 180°).
- **Scale** slider in controls modal.
- **Reset PDF view** restores default scale, rotation, and pan.
- Transform values persist to the map record.

### PDF reference markers

- Numbered circular markers overlaid at saved control-point PDF pixel positions.
- Selected point uses a larger blue marker; others use primary color.
- **Drag markers on the PDF** to reposition the PDF side of a reference pair (auto-saves).
- Hint overlay: “Scroll to zoom · drag to pan · drag refs to move”.
- During reference placement, hint: “Choose the matching spot on the base map first.”

---

## Base map (Leaflet)

- Leaflet map with zoom controls.
- **Default base style: Satellite** (Esri World Imagery).
- Alternate styles: **Outline** (Carto Positron, no labels), **Standard** (OpenStreetMap).
- Viewport persists (center + zoom) to the map record.
- ResizeObserver + delayed `invalidateSize` for stable layout in split pane.
- `doubleClickZoom` disabled so double-click can copy coordinates.

### Location search

- Nominatim geocoding from the controls modal (“Map area” section).
- Fits bounds when available, otherwise flies to the result at zoom 14.
- Search query text persists on the map record.

### Map reference markers

- Numbered draggable markers for saved control points on the base map.
- Selected point highlighted in blue; tooltip “Reference N · drag to move”.
- **Drag markers on the map** to reposition the map side of a reference pair (auto-saves, silent toast).
- Pending map pin shown as an amber circle marker before the PDF click completes the pair.

### Coordinate readout and copy

- **Live cursor readout** (bottom-right): lat/lng to 5 decimal places while hovering the map.
- **Click the readout** to copy coordinates to the clipboard (toast confirmation).
- **Double-click the map** to copy coordinates at that location (toast confirmation).
- Hint overlay: “Double-click to copy · drag refs to move”.

### Reference placement on the map

- In reference mode, crosshair cursor when picking a map point.
- Single click places the pending map pin (250 ms delay to distinguish from double-click).

---

## Reference points (control points)

Georeferencing pairs link **PDF pixel coordinates** ↔ **WGS84 map coordinates**, stored in Postgres `control_point` with PostGIS point geometry.

### Add reference workflow

1. Upload a PDF.
2. Click **Add reference** in the header.
3. Set the map side:
   - Click the base map, **or**
   - Paste coordinates / Google Maps link and click **Set pin**.
4. Click the matching spot on the PDF canvas.
5. Pair is saved; pending pin clears; markers appear on both panes.

### Paste coordinates (Google Maps)

- Accepts `lat, lng`, space-separated values, or Google Maps URLs (`@lat,lng` or `?q=lat,lng`).
- Parser: `apps/web/src/utils/parse-map-coordinates.ts`.
- Available in the reference-mode banner and in the controls modal.
- On success, map viewport pans to the pin (minimum zoom 16).

### Manage reference points (controls modal)

- List all saved points with PDF (x, y) → map (lat, lng) summary.
- **Select** a point to highlight it and pan the map to it.
- **Edit** inline: PDF X/Y and map coordinates; save or cancel.
- **Delete** a point.
- Drag updates on map or PDF save immediately (`silent: true` on drag mutations).

### Reference mode UI

- Contextual banner with step instructions.
- **Pick map point again** clears a pending pin without exiting reference mode.
- **Cancel** exits reference mode and clears pending state.

---

## Controls modal

Opened via **Controls** in the header. Sections:

1. **Reference points** — paste pin, list/edit/delete/drag-synced points.
2. **Map area** — Nominatim location search.
3. **Base map style** — Satellite / Outline / Standard toggle.
4. **PDF scale and rotation** — range sliders.
5. **Reset PDF view** — restore default transform.

---

## Data layer (Postgres)

| Table           | Purpose                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `map`           | Map metadata, PDF blob, viewport, transform prefs, base map style, `owner_id` |
| `control_point` | Reference pairs: `image_x`, `image_y`, `location` (point, SRID 4326)          |

Server modules:

- `apps/web/src/data-access-layer/maps/` — `maps.server.ts`, `maps.functions.ts`, `maps-query-options.ts`
- `apps/web/src/data-access-layer/control-points/` — same pattern

Recovery import: `pnpm --filter web db:import-stash` (see `scripts/import-data-stash.mjs`).

---

## Map handle (imperative API)

`map-handle.ts` exposes the Leaflet-side imperative surface used by the workspace:

| Method                  | Behavior                                           |
| ----------------------- | -------------------------------------------------- |
| `panToQuery(query)`     | Geocode via Nominatim, fit bounds or fly to result |
| `setViewport(viewport)` | Set map center and zoom without animation          |

Also exports base map tile config, default viewport, geocoding helper, coordinate formatting/copy helpers, and `createBaseLayer` / `createMapHandle` factories.

---

## Not implemented yet (for doc boundary)

- Affine georeference transform from control points (`compute_georeference`)
- Feature tracing / GeoJSON segments / merge-on-export
- Agent/MCP tools (`get_project_context`, `propose_feature_patch`, etc.)
- Export GeoJSON
- Multi-page PDF support (only page 1 rendered)
- External MCP endpoint (`/api/mcp`)

Planned agent workflow, chunking strategies, reference-point correction, and **vision vs coordinates (JSON + tools, not screenshot-only)**: [`agent-digitization-design.md`](agent-digitization-design.md).
