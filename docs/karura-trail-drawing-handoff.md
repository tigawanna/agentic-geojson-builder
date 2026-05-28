# Karura trail drawing — handoff

Handoff for the **next phase**: turn the georeferenced PDF + GPX reference overlay into **draft trail paths** (sparse vertices, easy to draw and merge). Personal-use Karura map; GPX underlay is a guide, PDF colored loops are the product truth.

**Status:** Georeference and reference overlay are in good shape. **Drawing paths is the active work.**

**Related:** [`agent-digitization-design.md`](agent-digitization-design.md) · [`map-workspace-features.md`](map-workspace-features.md) · [`desktop-app-handoff.md`](desktop-app-handoff.md) · [`TODOS.md`](../TODOS.md)

---

## What is done (do not redo)

| Item                      | Notes                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF + map alignment**   | Karura PDF loaded; ~32 control points placed (gates, junctions, trail bends).                                                                                                                                     |
| **Georeference**          | Affine PDF ↔ WGS84; verify residual is acceptable before trusting traces.                                                                                                                                         |
| **GPX reference overlay** | Import `map-data/geojson/karura-gpx-trails.geojson` via **Controls → Reference GeoJSON** (desktop: disk under `~/.config/desktop/maps/{id}/reference-geojson/`). Dashed lines on base map — use as underlay only. |
| **Data prep**             | `node map-data/gpx-to-geojson.mjs` converts repo GPX → GeoJSON when you add more tracks.                                                                                                                          |

---

## Goal for this phase

Produce **editable trail geometry** (one logical path per PDF loop), not a copy of every GPX vertex.

| Do                                                                                | Do not                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Place **enough** points to define each path (corners, junctions, obvious bends)   | Trace hundreds of points per loop like the GPX files |
| One **`segmentGroupId` per PDF color** (e.g. `5k-yellow`, `10k-blue`, `bike-red`) | Mix unrelated trails in one segment                  |
| Break long loops into **2–4 segments** between named junctions                    | One giant segment for an entire 10 km loop           |
| Use GPX overlay to **fill gaps** where the PDF line is unclear                    | Treat AllTrails/Trailforks as the official map       |

**Target density (rule of thumb)**

| Situation                                   | Points per segment                |
| ------------------------------------------- | --------------------------------- |
| Straight-ish forest track                   | 4–8                               |
| Curved section                              | 8–15                              |
| Complex junction → junction span            | 10–20 max                         |
| Whole 5k / 10k loop (all segments combined) | Often 30–80 after merge, not 500+ |

The app can **simplify on export** (Douglas–Peucker) later; input should still be sparse so drawing stays fast and reviewable.

---

## Recommended drawing workflow

### 1. One trail at a time

Match the PDF legend. Suggested order:

1. `5k-yellow` (shortest loop — learn the tools)
2. `10k-blue`
3. `bike-red` (or other bike track color on your PDF)
4. `15k-*` / composite loops if present
5. Access roads, dog paths, connectors last

### 2. Anchor-first mental model

Think **sparse anchors**, not continuous GPS:

```
Gate C → junction (3–5 clicks)
junction → river bend (5–8 clicks)
river bend → back to Gate C (5–8 clicks)
```

Each span becomes one **segment row** with `segmentIndex` 0, 1, 2…

Shared junctions should reuse the **same map coordinate** (same lat/lng at both segment ends) so merge/export connects cleanly.

### 3. Use the map, check the PDF

1. **Satellite** base map while clicking (Trace trail uses WGS84 on the map).
2. Glance at the **PDF pane** for color and label at each junction.
3. Glance at the **GPX dashed line** when the PDF ink is thin or missing — snap your clicks to the visible track on satellite, not every GPX vertex.

### 4. Save → review → next segment

- Save as **draft** first.
- Zoom in on junctions; drag vertices if needed (web UI).
- Accept or export only when the loop looks right.

---

## Where to draw (web vs desktop)

| App                                              | Reference overlay                      | Trace / save `geo_segment`                       |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------ |
| **Web** (`pnpm --filter web nodev`, `/maps/$id`) | IndexedDB import in Controls           | **Yes** — **Trace trail** in header              |
| **Desktop** (`pnpm --filter desktop dev`)        | Import in Controls → Reference GeoJSON | **Not yet** — view overlay + control points only |

**For this phase, use the web workspace to draw** unless trace mode is ported to desktop.

### Web: Trace trail (quick steps)

1. Open map (e.g. id `1`) at `/dashboard/maps/1` (or your map route).
2. Confirm georef: control points align on PDF and satellite.
3. Optional: import GPX reference in Controls (same file as desktop).
4. Click **Trace trail**.
5. **Ctrl+click** (or pick modifier per UI) on the base map to add vertices along one span.
6. Set **segment group** / path kind / name in the trace panel (match PDF color).
7. **Finish** when ≥ 2 points → saves a `geo_segment` row.
8. Repeat for next span; use **Export GeoJSON** when ready.

---

## Data model (what gets stored)

Each traced path is a `geo_segment` row:

| Field            | Karura example                     |
| ---------------- | ---------------------------------- |
| `segmentGroupId` | `10k-blue`                         |
| `segmentIndex`   | `0`, `1`, `2` …                    |
| `pathKind`       | `walking-trail`, `bike-path`, …    |
| `geometry`       | `LineString` in WGS84 `[lon, lat]` |
| `status`         | `draft` → review → `accepted`      |

Export merges segments by `segmentGroupId` into one feature per trail (see `apps/web/src/lib/geojson/export-segments.ts`).

---

## Using the GPX overlay effectively

The imported bundle (~7 trails, thousands of GPX vertices) is **visual reference only**.

| GPX helps with              | PDF still owns                 |
| --------------------------- | ------------------------------ |
| Trail centerline in trees   | Official loop names and colors |
| Missing PDF ink segments    | 5k / 10k / 15k semantics       |
| Junction hints on satellite | Gates, facilities, legend text |

**Workflow:** draw your sparse path on the map; use GPX to confirm you are on the right track; do not try to match GPX point density.

---

## Quality checklist (per trail)

- [ ] `segmentGroupId` matches PDF color / name
- [ ] Segments connect at junctions (endpoints meet)
- [ ] No accidental straight lines across forest blocks (compare satellite + GPX)
- [ ] Vertex count feels “sketchable” (tens, not hundreds per loop)
- [ ] Draft reviewed on satellite at z15–16
- [ ] Export FeatureCollection has **one feature per logical trail**, not per segment (use merge on export if offered)

---

## Optional product improvements (later)

Not required to start drawing; note for a future session:

| Improvement                              | Why                                                        |
| ---------------------------------------- | ---------------------------------------------------------- |
| **Trace trail on desktop**               | Same machine as PDF overlay without switching to web       |
| **Snap click to nearest reference line** | Faster tracing along GPX underlay                          |
| **“Sparse mode” UI hint**                | e.g. warn if segment has > 40 vertices                     |
| **Segment gap detector in UI**           | Highlight unconnected ends between segments in a group     |
| **PDF-pixel trace + georef**             | Agent/human trace on PDF, server converts (see design doc) |

---

## Files and commands

| Task                        | Command / path                                |
| --------------------------- | --------------------------------------------- |
| Regenerate GeoJSON from GPX | `node map-data/gpx-to-geojson.mjs`            |
| Combined reference file     | `map-data/geojson/karura-gpx-trails.geojson`  |
| Import in app               | Controls → Reference GeoJSON → Import GeoJSON |
| Web workspace               | `apps/web/.../MapAlignmentWorkspace.tsx`      |
| Segment export              | `apps/web/src/lib/geojson/export-segments.ts` |
| Design (chunking, simplify) | `docs/agent-digitization-design.md`           |

---

## Success criteria for this phase

1. At least **one full PDF loop** (e.g. 5k yellow) captured as merged GeoJSON with sparse vertices.
2. Geometry **follows** GPX/satellite where PDF is weak, but **labels and grouping** follow the PDF.
3. Exported file is suitable for personal map use (clean FeatureCollection, not raw GPX dump).

When that loop feels easy, repeat for the remaining colors.
