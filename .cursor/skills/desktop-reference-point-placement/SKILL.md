---
name: desktop-reference-point-placement
description: Places PDF-to-map reference (control) points via the agentic-geojson-desktop MCP server. Use when calibrating maps, digitizing trails from PDF overlays, placing reference points, or calling create_control_point_from_viewport_pixels, set_map_viewport, get_rendered_map_view_with_coverage, or the place_reference_point MCP prompt.
---

# Desktop reference point placement

Place **control points** that link PDF source pixels to WGS84 on the Leaflet map. Required before georeferencing and trail tracing.

**Also available via MCP:** prompt `place_reference_point`, tool `get_reference_point_placement_guide`, resource `guide://agentic-geojson/control-point-placement`.

**Code reference:** `apps/desktop/src/shared/agent-control-point-placement-guide.ts`

---

## Prerequisites

- Map workspace open for the target `mapId` (split PDF + map in the desktop app).
- MCP at `http://127.0.0.1:3847/mcp` (Settings → Local MCP server).
- Plan for **at least 3 points**, spread across the map (not clustered).

---

## Workflow

1. `list_maps` — get `mapId`.
2. `get_tile_cache_status` — note cache bounds; stay inside them for map tiles.
3. `set_map_viewport` — frame the trail area (`fitBounds` or lat/lng + zoom **15–16**).
4. `get_rendered_map_view_with_coverage` with `liveCapture: true`.
   - Require `tileCacheCoverage.overlapPercent` **≥ 99** before trusting the map pane.
   - Read `snapshot.mapPane.viewport.bounds` for pixel ↔ WGS84 math.
5. Study both PNGs (captures include agent grids):
   - **PDF:** 100 px grid; bottom = X, left = Y; coordinates are **imageX/imageY**.
   - **Map:** lat/lon edge ticks + N/S/E/W header; pane pixels → WGS84 via bounds.
6. Pick the **same feature** on both panes (see targets below).
7. Verify (recommended): `map_pane_pixel_to_lon_lat`, `pdf_pane_pixel_to_image_xy`.
8. `create_control_point_from_viewport_pixels` with `mapPaneX/Y`, `pdfPaneX/Y`, and a clear `label`.
9. `list_control_points` — confirm persistence; recapture once to visually verify markers.

---

## Best targets for trail / path work

| Target                                     | Why                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| **Trail intersections**                    | Where colored loops meet (5 km / 10 km / 15 km) — anchors path tracing |
| **Named gates** (A, C, D, K on PDF legend) | Match roads on OSM                                                     |
| **River Cafe, Mau-Mau Caves, Waterfall**   | Text on PDF + feature on map                                           |
| **Road–forest crossings**                  | Limuru Rd, Kiambu Rd at forest edge                                    |

**Avoid:** featureless canopy, viewport corners, points visible on only one pane.

---

## Accuracy tactics (agent)

1. **Frame first** — never place from a stale snapshot; always capture after `set_map_viewport`.
2. **Read the grid** — snap PDF clicks to grid lines; on the map, use edge ticks, not guessed center.
3. **Intersect, don't midpoint** — place on trail **forks** and **gates**, not middle of a straight segment.
4. **Converter sanity check** — run pixel→coord tools before `create_control_point_from_viewport_pixels`; abort if labels don't match the landmark you intended.
5. **Spread triangle** — three points should form a wide triangle (NW / SE / center), not a line.
6. **Zoom discipline** — zoom 15–16 for placement; wider zoom only for context.
7. **Verify after place** — recapture; green marker must sit on the landmark on **both** panes. If wrong, `update_control_point` or delete and retry.
8. **Descriptive labels** — `Gate C / Kiambu Rd`, `River Cafe 5/10/15 km junction` — humans audit from labels.
9. **One point per landmark** — do not stack multiple references on the same intersection.
10. **PDF at default view** — if the PDF was panned/zoomed in the UI, capture may still be full-document; match **image** coordinates from the capture, not the current on-screen pan.

---

## Tool cheat sheet

| Tool                                                       | Use                                               |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `set_map_viewport`                                         | Frame area before capture                         |
| `get_rendered_map_view_with_coverage`                      | Primary capture + tile coverage                   |
| `map_pane_pixel_to_lon_lat` / `pdf_pane_pixel_to_image_xy` | Pre-flight verification                           |
| `create_control_point_from_viewport_pixels`                | **Preferred** placement                           |
| `create_control_point`                                     | When coords already known                         |
| `get_map_sector_view`                                      | Optional: satellite check at lat/lng inside cache |

---

## Coordinate spaces

| Pane | Space                       | Fields                              |
| ---- | --------------------------- | ----------------------------------- |
| PDF  | pdf-pixels, origin top-left | `pdfPaneX/Y` → `imageX/imageY`      |
| Map  | WGS84                       | `mapPaneX/Y` → `longitude/latitude` |

Never infer lat/lng from the image without snapshot bounds or converter tools.

---

## Further reading

Product and code ideas for higher accuracy: [accuracy-improvements.md](accuracy-improvements.md)

Human-oriented doc: [docs/agent-control-point-placement.md](../../../docs/agent-control-point-placement.md)
