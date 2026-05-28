# Accuracy improvements — reference points & trail mapping

Tactics for agents today, plus product/code ideas for the desktop app.

---

## Agent tactics (use now)

| Tactic                   | Detail                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Coverage gate            | Do not place when `tileCacheCoverage.overlapPercent` < 99; reposition viewport and recapture.                     |
| Landmark pairing         | Only place when the same named feature appears on PDF and map (gate letter, cafe, cave, road name).               |
| Junction over segment    | Trail **intersections** and **starts** beat random points along a curve.                                          |
| Grid-assisted PDF coords | Use 100 px grid on captures; prefer coordinates on grid lines (e.g. 600, 550 not 587, 563).                       |
| Pre-commit converters    | Call `map_pane_pixel_to_lon_lat` and `pdf_pane_pixel_to_image_xy` before create; compare to landmark expectation. |
| Post-commit verify       | Recapture after create; marker must align on both panes.                                                          |
| Geometric spread         | Points should span N/S and E/W extent of the work area (triangle, not collinear).                                 |
| Zoom lock                | Placement at z15–16; avoid placing after auto-fit zoomed to a single point.                                       |
| Sector cross-check       | `get_map_sector_view` at the converted lat/lng can confirm satellite context (optional).                          |
| Incremental calibration  | Place 3 rough anchors first, then refine a 4th point if georef residual is high (when georef exists).             |

---

## Product improvements (backlog)

### Capture & viewport

- [ ] **Placement mode capture** — skip `fitControlPoints` on agent-driven capture so viewport does not jump after each point.
- [ ] **Crosshair overlay** on live map/PDF during agent sessions (not only on PNG export).
- [ ] **Suggested anchors** in snapshot metadata — list 3–5 landmark names with approximate PDF pixels from OCR/legend parsing.
- [ ] **Snapshot diff** tool — highlight viewport shift or new markers between two captures.

### Feedback at placement time

- [ ] **`placementQuality` in MCP response** — `{ coverageOk, spreadScore, distanceToNearestKm, warnings[] }`.
- [ ] **Warn if PDF viewTransform ≠ identity** — pan/zoom/rotation on PDF pane vs full-document capture mismatch.
- [ ] **Residual preview** — after 3+ points, show predicted affine error at click location before save.

### Visual aids

- [ ] **Finer PDF grid** (50 px) optional for high-zoom crops.
- [ ] **Trail-colored overlay** on map capture when tile composite mode is used (match PDF legend colors).
- [ ] **Highlight excluded georef outliers** when updating points.

### Geometry & matching

- [ ] **Snap to nearest OSM path** within N meters when placing map-side (optional toggle).
- [ ] **Snap to nearest PDF stroke** via vector PDF parse (future).
- [ ] **Minimum separation** — reject new point if < 200 m from existing (configurable).

### Workflow

- [ ] **Batch place from checklist** — human/agent defines gate list A–K, agent places each in sequence with verify step.
- [ ] **Undo last MCP placement** without delete-by-id round trip.

---

## MCP surfaces

| Surface       | Name                                                             |
| ------------- | ---------------------------------------------------------------- |
| Cursor skill  | `.cursor/skills/desktop-reference-point-placement/`              |
| MCP prompt    | `place_reference_point`                                          |
| MCP tool      | `get_reference_point_placement_guide`                            |
| MCP resource  | `guide://agentic-geojson/control-point-placement`                |
| Shared string | `apps/desktop/src/shared/agent-control-point-placement-guide.ts` |

Keep skill + shared guide aligned when workflow changes.
