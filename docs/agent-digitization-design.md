# Agent-assisted digitization — design handoff

Design decisions for how agents (in-app chat, MCP, external cloud tools) help turn PDF trail maps into georeferenced GeoJSON. Complements [`TODOS.md`](../TODOS.md) and [`map-workspace-features.md`](map-workspace-features.md).

Reference case: **Karura Forest** PDF — multiple colored loops (5 km yellow, 10 km blue, bike track red, etc.).

---

## Core principle

**GeoJSON is an export format, not working storage.**

Agents must never return one massive FeatureCollection in a single turn. Work happens in small, reviewable rows; assembly and simplification happen at export or accept time.

```
Work layer     →  many small DB rows (segments, anchors, draft features)
Review layer   →  merge, snap, validate, simplify, human accept/reject
Export layer   →  FeatureCollection (only when needed)
```

---

## Three coordinate spaces

Every agent tool and UI action must know which space it operates in:

| Space                   | Example                          | Used for                                               |
| ----------------------- | -------------------------------- | ------------------------------------------------------ |
| **PDF pixels**          | `(1100, 420)` on rendered page 1 | Vision tracing on source map, control point PDF side   |
| **Map WGS84**           | `[-1.24500, 36.81234]`           | Leaflet display, final GeoJSON, control point map side |
| **Transformed overlay** | PDF pixel → lon/lat via affine   | Converting agent traces to GeoJSON after georeference  |

Flow:

1. Human (or agent-assisted) places **control points** linking PDF ↔ map.
2. Server computes **affine transform** from 3+ points (`compute_georeference`).
3. Agent traces in **PDF pixel space** (vision) or **map space** (satellite comparison).
4. Server converts patches to WGS84 using the stored transform.
5. Human reviews on the map; drags vertices or reference points to correct errors.

Agents should **not** invent survey-grade coordinates without control points. They propose drafts; humans and transforms ground them.

---

## Chunking strategies

Use one or combine depending on map size and complexity.

### 1. One logical feature per trail (best first step for Karura)

The PDF already splits by colored route. Agent task scope:

- “Trace the **blue 10 km loop** only.”
- Expected payload: ~50–200 vertices, not the whole forest.

Each trail becomes a **`segmentGroupId`** (e.g. `10k-blue`, `5k-yellow`, `bike-red`).

### 2. Segment rows (long or complex paths)

Break each trail into ordered segments between anchors:

```
Segment 1: gate → junction       (12 vertices)
Segment 2: junction → river      (18 vertices)
Segment 3: river → gate          (15 vertices)
```

Each segment is its own DB row:

| Field                           | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `segmentGroupId`                | Which trail/path (e.g. `10k-blue`)                    |
| `segmentIndex`                  | Order within the group                                |
| `startAnchorId` / `endAnchorId` | Optional explicit graph links                         |
| `geometry`                      | Small LineString (PDF pixels pre-georef, WGS84 after) |
| `pathKind`                      | `bike-path`, `walking-trail`, etc.                    |
| `status`                        | `draft` → `needs-review` → `accepted` / `rejected`    |
| `confidence`                    | Agent self-score 0–1                                  |
| `coordinateSpace`               | `pdf-pixels` or `wgs84`                               |

Merge on accept — not during agent turns.

### 3. Anchor + span model (smallest agent payloads)

Agent places **sparse corner anchors** only (5–10 points per turn). App **densifies** between anchors (linear interpolation, spline, or a second pass).

Good when mid-segment curves are uncertain on the PDF.

### 4. Spatial tiles (large maps only)

Split PDF into bbox tiles (e.g. 500×500 px). Segments crossing tiles share endpoint IDs or `continuesFromSegmentId`.

Karura likely does **not** need this initially — trail-per-feature + segments is enough.

---

## Merge pipeline (on accept or export)

Run server-side (Turf) when segments are accepted or on export:

| Step           | Action                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| Snap endpoints | Endpoints within ~5–15 m (or N pixels pre-georef) → same node            |
| Order segments | Sort by `segmentIndex` or walk graph from shared anchors                 |
| Concatenate    | `coords(A) + coords(B)`, drop duplicate junction vertex                  |
| Validate       | No self-intersections, min vertex count, reasonable length vs trail type |
| Simplify       | Douglas–Peucker (e.g. 1–3 m tolerance) before export                     |
| Export         | One `LineString` or `MultiLineString` per trail in FeatureCollection     |

Store **raw** and **simplified** optionally; export uses simplified by default.

---

## How the agent should see the map

Agents need **structured context + images**, not freeform chat coordinates.

### Context JSON (`get_project_context`)

Return compact structured state:

- Map metadata, viewport, base map style, PDF transform prefs
- All control points (PDF x/y + lat/lng)
- Georeference status (method, residual error meters, ready or not)
- Existing segments per `segmentGroupId` with status
- **Gap report**: missing links between segments (e.g. “seg 2 end ≠ seg 3 start”)
- Feature counts by status (draft / accepted / rejected)

### Visual snapshots (`get_rendered_map_view`) — client tool

Capture from the live workspace:

- **PDF pane** — current canvas viewport (what the human sees after pan/zoom/rotate)
- **Base map pane** — current Leaflet viewport (satellite context)

Send both to a vision model for `propose_features_from_overlay`. Include scale metadata (canvas size, map bounds) so traces can map back to pixel or geo space.

### What agents should do

- Work **one trail or one segment at a time**
- Call `list_feature_segments` / gap detection before proposing
- Return **`apply_feature_patch`** ops (~0.5–3 KB per turn), not full collections
- Set `pathKind`, `name`, `confidence`, `source: agent-proposal`, `status: draft`
- Report uncertainty (“cannot see path between seg 2 and 3”)

### What agents should not do

- Dump the entire map in one JSON response
- Replace or delete human-placed control points without explicit tool + review
- Write `accepted` features directly — drafts only until human accept
- Assume sub-meter accuracy without georeference + review

---

## Agent loop (segmented extraction)

Recommended autonomous loop (MCP or in-app chat):

```
1. get_project_context(mapId)
2. get_rendered_map_view()          ← client: PDF + map PNGs
3. pick segmentGroupId with largest gap or user-requested trail
4. propose_features_from_overlay    ← vision → apply_feature_patch (one segment)
5. repeat until find_gaps → empty
6. human reviews drafts on map
7. merge_feature_segments on accept
8. export_geojson when ready
```

Human can interrupt at any step: drag reference points, edit segment vertices, reject bad agent segments.

---

## Reference point correction (agent + human)

Reference points are the grounding layer. Both humans and agents may need to adjust them.

### Human (already built)

- Drag markers on PDF or map (auto-save)
- Edit PDF X/Y and lat/lng in controls modal
- Delete and re-add pairs

### Agent-assisted (planned tools)

| Tool                                | Purpose                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `update_control_point`              | Nudge PDF or map side when agent detects misalignment (e.g. gate icon off center)        |
| `suggest_control_point_adjustments` | Return proposed deltas + rationale from overlay vs satellite comparison — human confirms |
| `compute_georeference`              | Re-run affine after control point changes; surface residual error                        |

After any control point change:

- Clear or recompute stale georeference
- Re-transform draft segments still in PDF pixel space
- Flag accepted features that may need re-review

Agents may **propose** reference moves; default policy is **draft adjustment + human accept** unless user enables auto-apply for small residuals.

---

## Labeling and properties

Agent should attach app properties (from `packages/isomorphic/src/geojson-builder.ts`):

- `pathKind`: `bike-path`, `dog-path`, `walking-trail`, `service-road`, etc.
- `name`: from PDF legend text when visible
- `notes`: uncertainty, occlusions, alternative interpretations
- `confidence`: 0–1
- `source`: `agent-proposal`
- `status`: always `draft` on create

Point features (gates, picnic sites, junctions) can be separate **`Point`** drafts or anchor nodes in the segment graph.

---

## Payload size targets

| Approach                     | Per agent turn                |
| ---------------------------- | ----------------------------- |
| Full forest, all trails      | 100 KB–several MB — **avoid** |
| One trail, simplified        | 5–30 KB — acceptable          |
| One segment (10–30 vertices) | 0.5–3 KB — **ideal**          |
| Anchor points only (5–10)    | < 1 KB — very safe            |

Simplify on export even if raw vertices are stored internally.

---

## Data model (target tables)

Align with Phase 1 Postgres migration in `TODOS.md`:

| Table           | Role                                                      |
| --------------- | --------------------------------------------------------- |
| `map`           | Project + workspace prefs + PDF ref + `owner_id`          |
| `control_point` | PDF ↔ WGS84 pairs                                         |
| `georeference`  | Affine/projective transform JSON + RMS error              |
| `geo_segment`   | Chunk geometry + `segmentGroupId` + order + status        |
| `geo_feature`   | Merged accepted geometry (optional cache of merge output) |
| `agent_run`     | Tool name, input snapshot ids, status, model              |

Start with `map` + `control_point`; add `geo_segment` before agent tracing ships.

---

## Example patch shape (`apply_feature_patch`)

Small upsert per turn — coordinates in PDF pixels until georeference exists:

```json
{
  "op": "upsert_segment",
  "mapId": 1,
  "segmentGroupId": "10k-blue",
  "segmentIndex": 2,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [1100, 400],
      [1115, 420],
      [1130, 445]
    ]
  },
  "properties": {
    "pathKind": "walking-trail",
    "name": "10 km Blue Loop",
    "status": "draft",
    "confidence": 0.72,
    "coordinateSpace": "pdf-pixels"
  }
}
```

Server converts to WGS84 when georeference is available before map display.

---

## Karura workflow (end-to-end target)

1. Upload PDF, search “Karura Forest, Nairobi”, switch to satellite.
2. Place 4–6 control points on gates/road junctions (human + optional agent nudge).
3. `compute_georeference` → show residual error in UI.
4. Agent traces **yellow 5k** as 2–4 segments → draft rows.
5. Human reviews, drags vertices, accepts segments.
6. App merges → one LineString per trail, simplifies, shows on map.
7. Repeat for blue, green, red trails.
8. Export FeatureCollection with **4 features**, not megabytes of redundant vertices.

---

## Related docs

- [`TODOS.md`](../TODOS.md) — phased implementation checklist
- [`map-workspace-features.md`](map-workspace-features.md) — what the UI already does
- [`GAMEPLAN.md`](../GAMEPLAN.md) — product modules and tool names
- [`packages/isomorphic/src/geojson-builder.ts`](../packages/isomorphic/src/geojson-builder.ts) — shared Zod contracts
