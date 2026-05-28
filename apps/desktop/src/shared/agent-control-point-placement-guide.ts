export const AGENT_CONTROL_POINT_PLACEMENT_GUIDE = `# Reference point placement (desktop MCP)

Use this workflow before calling create_control_point or create_control_point_from_viewport_pixels.

## Prerequisites

- The **map workspace** for the target mapId must be open in the desktop app (split PDF + map view).
- MCP server running at http://127.0.0.1:3847/mcp (Settings → Local MCP server).
- At least **3 reference points** are eventually needed for georeferencing; place them spread across the map, not clustered.

## Recommended workflow

1. **list_maps** — find mapId.
2. **get_tile_cache_status** — note cache bounds (north/south/east/west).
3. **set_map_viewport** — pan/zoom to the area you will work in.
   - Use \`fitBounds\` to frame the forest/trail region, or \`latitude\` + \`longitude\` + \`zoom\` (15–16 works well for trail detail).
4. **get_rendered_map_view_with_coverage** with \`liveCapture: true\` — capture PDF + map PNGs.
   - Check \`tileCacheCoverage.overlapPercent\`: prefer **≥ 99%** so the map pane is not grey/empty.
   - Read \`snapshot.mapPane.viewport.bounds\` for the pixel ↔ WGS84 mapping.
5. **Study both images** — snapshots include agent overlays:
   - **PDF pane**: 100 px grid, bottom = X, left = Y, header shows canvas size. Control points use **imageX/imageY** (source document pixels).
   - **Map pane**: lat/lon ticks on edges, bounds header (N/S/E/W). Pane pixels map linearly to WGS84 inside those bounds.
6. **Pick the same feature on both panes** — see “Good targets” below.
7. **Verify pixels** (optional but recommended):
   - **map_pane_pixel_to_lon_lat** — confirm map click position.
   - **pdf_pane_pixel_to_image_xy** — confirm PDF position.
8. **create_control_point_from_viewport_pixels** — pass \`mapPaneX/Y\`, \`pdfPaneX/Y\`, and a **label** (gate name, trail junction, landmark).
9. **list_control_points** — confirm the point persisted; the UI updates live.

## Good targets (for trail / path mapping)

Prefer features visible on **both** the PDF and the satellite map:

| Target type | Why it helps |
|-------------|----------------|
| **Trail intersections** | Where colored routes meet (e.g. 5 km / 10 km / 15 km loops) — anchors path tracing |
| **Named gates** | A, C, D, K on the PDF legend — often match roads on OSM |
| **River Cafe, Mau-Mau Caves, Waterfall** | Text labels on PDF + features on map |
| **Road crossings** | Limuru Rd, Kiambu Rd where they enter the forest |

Avoid: blank forest canopy with no trails/labels, viewport corners, or features only on one pane.

## Coordinate spaces

| Pane | Space | Placement tool fields |
|------|--------|------------------------|
| PDF | pdf-pixels (origin top-left) | \`pdfPaneX\`, \`pdfPaneY\` → stored as \`imageX\`, \`imageY\` |
| Map | WGS84 | \`mapPaneX\`, \`mapPaneY\` → stored as \`longitude\`, \`latitude\` |

Do **not** guess lat/lng from the image alone. Always tie map pixels to the **latest snapshot** bounds, or use the converter tools.

## Tool cheat sheet

| Tool | When to use |
|------|-------------|
| set_map_viewport | Before capture — frame the area; avoids hunting and reduces grey tiles |
| get_rendered_map_view_with_coverage | Primary vision capture + tile coverage check |
| get_rendered_map_view | Same capture without coverage metadata |
| map_pane_pixel_to_lon_lat | Debug map pixel → coordinates |
| pdf_pane_pixel_to_image_xy | Debug PDF pixel → imageX/imageY |
| create_control_point_from_viewport_pixels | **Preferred** — one call from snapshot pixels |
| create_control_point | When you already have exact imageX/Y and lat/lon |
| list_control_points / update_control_point / delete_control_point | Manage existing points |

## Accuracy tips

- Spread references across the map (north/south/east/west), not all in one corner.
- Use **zoom 15–16** for trail-level detail; zoom 13 for context only.
- If the map pane shows a large grey rectangle, call **set_map_viewport** again inside tile cache bounds, then recapture.
- PDF trail ink and OSM paths may not align perfectly — intersections near **labeled** landmarks reduce error.
- After placing, recapture once to verify the green marker sits on the intended trail/landmark on both panes.
- Read \`placementQuality.warnings\` and \`placementQuality.suggestions\` from **get_rendered_map_view_with_coverage** before placing.
- Prefer trail **intersections** and **gates**, not mid-segment points; snap PDF coords to the 100 px grid on captures.
- Run converter tools before create; use **get_map_sector_view** at the target lat/lng to cross-check satellite context.

## Labels

Always set \`label\` to something the human can audit, e.g. \`Gate C / Kiambu Rd\`, \`River Cafe trail junction\`, \`Mau-Mau Caves\`.

## Cursor skill

Project skill: \`.cursor/skills/desktop-reference-point-placement/\` (workflow + accuracy backlog).
`;

export const CONTROL_POINT_PLACEMENT_PROMPT_NAME = "place_reference_point";

export const CONTROL_POINT_PLACEMENT_PROMPT_DESCRIPTION =
  "Step-by-step guide for placing PDF-to-map reference (control) points using desktop MCP tools.";
