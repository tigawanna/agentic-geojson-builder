---
name: desktop-trail-segment-drawing
description: Draws trail/path segments between control points via the agentic-geojson-desktop MCP server. Use when tracing trails, drawing paths, creating LineString segments, calling apply_feature_patch, or connecting control points with trail geometry.
---

# Desktop trail segment drawing

Draw **trail segments** (LineString geometries) between control points on the Leaflet map. This is the core workflow for digitizing trails from a PDF source document.

**Also available via MCP:** prompt `draw_trail_segment`, tool `get_trail_segment_drawing_guide`, resource `guide://agentic-geojson/trail-segment-drawing`.

**Code reference:** `apps/desktop/src/shared/agent-trail-segment-drawing-guide.ts`

---

## The #1 mistake agents make

Agents guess or hallucinate coordinates instead of reading the actual control point locations. This results in segments that are stored correctly in the database but render **kilometers off-screen**, appearing "invisible" to the user.

**Fix:** ALWAYS call `list_control_points` first and use those exact lat/lng values.

---

## Prerequisites

- Map workspace open for the target `mapId` (split PDF + map view).
- MCP at `http://127.0.0.1:3847/mcp` (Settings → Local MCP server).
- At least 2 control points placed that you want to connect.

---

## Workflow

1. `list_maps` → get `mapId`.
2. `list_control_points` → get the **exact WGS84 coordinates** of all control points.
3. Identify the start and end control points for your segment.
4. `set_map_viewport` → frame the area between those points (zoom 17–18).
5. `get_rendered_map_view_with_coverage` → capture to see the trail visually.
6. Build the LineString geometry:
   - **First coordinate** = start point as `[longitude, latitude]`
   - **Last coordinate** = end point as `[longitude, latitude]`
   - **Intermediate points** = 3–8 points following the trail curve, interpolated between start and end
7. `apply_feature_patch` with:
   - `op: "upsert_segment"`
   - `coordinateSpace: "wgs84"`
   - `geometry: { type: "LineString", coordinates: [[lng, lat], ...] }`
   - `segmentGroupId`: trail group name (e.g., "10k-blue")
   - `pathKind`: one of "walking-trail", "bike-path", "dog-path", "service-road", etc.
8. `list_feature_segments` → verify the segment was created with correct coordinates.

---

## Coordinate format (critical)

| Source                 | Format                                      | Example              |
| ---------------------- | ------------------------------------------- | -------------------- |
| Control point response | `{ latitude: -1.2375, longitude: 36.8405 }` | lat first            |
| GeoJSON coordinate     | `[longitude, latitude]`                     | `[36.8405, -1.2375]` |

**The swap from `{lat, lng}` to `[lng, lat]` is where most errors happen.**

---

## Sanity checks before creating

Before calling `apply_feature_patch`, verify ALL of these:

1. All coordinates are `[longitude, latitude]` (lng is ~36.8 for Karura Forest area)
2. First coordinate matches start control point (within ±0.0001)
3. Last coordinate matches end control point (within ±0.0001)
4. All intermediate points fall between start and end (±0.001 tolerance)
5. At least 2 coordinates in the array
6. Coordinates are NOT pdf-pixel values (those would be like `[450, 300]`)

---

## Intermediate point estimation

For a trail between two points:

```
Start: [36.8405, -1.2375]
End:   [36.8397, -1.2381]

Delta lng = -0.0008, delta lat = -0.0006
```

Divide into N segments and add slight offsets for curves:

```json
[
  [36.8405, -1.2375],
  [36.8403, -1.2376],
  [36.8401, -1.2378],
  [36.8399, -1.2379],
  [36.8397, -1.2381]
]
```

For curved trails, offset perpendicular to the straight line by 0.0001–0.0005 degrees.

---

## Tool cheat sheet

| Tool                                  | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `list_control_points`                 | **ALWAYS CALL FIRST** — get real coordinates |
| `apply_feature_patch`                 | Create/update/delete segments                |
| `list_feature_segments`               | Verify created segments                      |
| `set_map_viewport`                    | Frame area for visual capture                |
| `get_rendered_map_view_with_coverage` | Visual trail reference                       |
| `snap_to_reference`                   | Snap a point to existing reference lines     |
| `snap_trace_to_reference`             | Snap entire trace to reference lines         |
| `get_trail_segment_drawing_guide`     | Full MCP-served guide text                   |

---

## Debugging invisible segments

If a segment appears "invisible" after creation:

1. `list_feature_segments` → confirm it exists, check coordinates
2. Compare segment coordinates with control point coordinates
3. If segment lng/lat are far from control points → wrong coordinates were used
4. Fix: `apply_feature_patch` with `op: "delete_segment"` then recreate with correct coords
5. `set_map_viewport` to the segment's coordinates to verify it renders somewhere

---

## Example: draw segment between points 20 and 21

```
1. list_control_points → Point 20: lat=-1.2375, lng=36.8405
                          Point 21: lat=-1.2381, lng=36.8397

2. apply_feature_patch:
   {
     mapId: 4,
     op: "upsert_segment",
     segmentGroupId: "10k-blue",
     name: "Point 20 to 21",
     pathKind: "walking-trail",
     coordinateSpace: "wgs84",
     geometry: {
       type: "LineString",
       coordinates: [
         [36.8405, -1.2375],   // Point 20 (start)
         [36.8403, -1.2376],   // intermediate
         [36.8401, -1.2378],   // intermediate
         [36.8399, -1.2379],   // intermediate
         [36.8397, -1.2381]    // Point 21 (end)
       ]
     }
   }
```
