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

## Vision vs coordinates — how agents get location

### The constraint

Vision models looking at a screenshot receive **pixels and labels**. They do **not** natively receive WGS84 coordinates. A JPEG does not embed lat/lng unless you attach that data separately.

### Wrong mental model

> Agent sees screenshot → infers lat/lng from the picture alone

This can work loosely (“that looks like a gate”) but not for consistent georeferencing. Pixel-to-degree math from a screenshot without bounds or a transform is unreliable.

### Correct mental model

> Agent sees screenshot for **what / where visually**  
> Agent uses **tools + structured context** for **exact coordinates**

Images and numbers are **two channels**, both required. Neither replaces the other.

### Three ways to expose “location” to an agent

| Channel                       | What the agent gets                                                        | Used for                                            |
| ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **Structured context (JSON)** | Control points, viewport bounds, transform coefficients, existing segments | Exact coordinates, math, gap detection              |
| **Images (PNG snapshots)**    | PDF pane + Leaflet pane                                                    | Trace trails, read legend labels, visual comparison |
| **Tools (write API)**         | Validated create/update with explicit coords                               | Persist pins, segments, patches                     |

There is no special “map API the LLM understands natively.” The agent interface is **JSON + optional images + write tools**. The Leaflet UI is for humans; MCP and chat use the same server state.

### Default pipeline: trace in PDF pixels, convert on the server

Best default for Karura-style PDFs:

1. Human places 3+ control points (features visible on **both** PDF and satellite).
2. Server runs `compute_georeference` (affine PDF → WGS84).
3. Agent traces paths in **PDF pixel space** (vision-friendly).
4. Server converts vertices via stored transform.
5. Human reviews on satellite; drags vertices or reference points if needed.

The agent does **not** read lat/lng off a screenshot. It reads trails on the PDF image and outputs **pixels** (or calls tools that accept pixels); the georeference layer owns geo math.

### When the agent works directly in lat/lng

Use WGS84 in tool outputs when:

- Placing a reference pin by matching a **known satellite feature** in the current viewport
- Adjusting an existing control point after visual misalignment
- The agent has **viewport bounds + existing control points** as anchors — not raw pixel guessing

Even then, output is a **tool call** (`create_control_point`, `update_control_point`). The server stores and validates; the UI re-renders markers.

### Verification loop (screenshot as QA, not positioning)

The intended flow — place pin, get lat/lng, check screenshot — is valid as **step 6**, not as the primary way to obtain coordinates:

```
1. get_project_context           → refs, transform, bounds
2. get_rendered_map_view         → PDF + satellite PNGs + metadata
3. Agent proposes coords         → PDF pixels OR lat/lng via tool call
4. create_control_point / apply_feature_patch  → server persists
5. UI renders markers on map + PDF
6. Optional fresh snapshot       → vision checks “is marker on the gate?” (pass/fail)
7. If off: update_control_point  → human or agent nudge; recompute georeference
```

Step 6 is qualitative **sanity check**. Step 4 is where real coordinates live.

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

Agents need **structured context + images + tools**, not freeform chat coordinates or screenshot-only inference.

### Context JSON (`get_project_context`)

Return compact structured state (exact coordinates live here):

- Map metadata, viewport center/zoom, **viewport bounds** (north/south/east/west)
- Base map style, PDF view transform (scale, rotation, pan)
- All control points: `{ id, imageX, imageY, latitude, longitude }`
- Georeference: `{ method, transform, residualErrorMeters, ready }`
- Existing segments per `segmentGroupId` with status and `coordinateSpace`
- **Gap report**: missing links between segments
- Feature counts by status (draft / accepted / rejected)

Example shape (illustrative):

```json
{
  "mapId": 1,
  "name": "Karura Forest",
  "mapViewport": {
    "center": { "latitude": -1.245, "longitude": 36.812 },
    "zoom": 16,
    "bounds": {
      "north": -1.238,
      "south": -1.252,
      "east": 36.825,
      "west": 36.799
    }
  },
  "pdfView": {
    "scale": 1.2,
    "rotation": 0,
    "panX": 0,
    "panY": 0,
    "pageWidth": 1800,
    "pageHeight": 2400
  },
  "controlPoints": [
    {
      "id": 1,
      "imageX": 420,
      "imageY": 880,
      "latitude": -1.2461,
      "longitude": 36.8112
    }
  ],
  "georeference": {
    "method": "affine",
    "ready": true,
    "residualErrorMeters": 12.4
  },
  "segmentGroups": [{ "segmentGroupId": "10k-blue", "segmentCount": 2, "gapCount": 1 }]
}
```

Do not embed full GeoJSON FeatureCollections in context — summaries and ids only.

### Visual snapshots (`get_rendered_map_view`) — client tool

Capture from the live workspace and **always return metadata alongside images**. Never send a naked PNG.

#### Captures

| Pane                   | Agent uses it for                                                               |
| ---------------------- | ------------------------------------------------------------------------------- |
| **PDF pane**           | Trace colored trails, read legend text, find junctions in pixel space           |
| **Base map pane**      | Compare against satellite roads, trails, gates                                  |
| **Optional composite** | Same viewport with numbered control points overlaid (helps verification step 6) |

#### Required metadata (agent coordinate contract)

Every `get_rendered_map_view` response must include:

```json
{
  "capturedAt": "2026-05-23T12:00:00.000Z",
  "pdfPane": {
    "imageBase64": "...",
    "mimeType": "image/png",
    "canvasWidth": 1800,
    "canvasHeight": 2400,
    "coordinateSpace": "pdf-pixels",
    "origin": "top-left",
    "note": "Coordinates match rendered page 1 at scale 1.5; not screen CSS pixels"
  },
  "mapPane": {
    "imageBase64": "...",
    "mimeType": "image/png",
    "viewport": {
      "center": { "latitude": -1.245, "longitude": 36.812 },
      "zoom": 16,
      "bounds": {
        "north": -1.238,
        "south": -1.252,
        "east": 36.825,
        "west": 36.799
      }
    },
    "coordinateSpace": "wgs84",
    "baseMapStyle": "satellite"
  },
  "controlPointsVisible": true,
  "overlays": {
    "pendingMapPin": null,
    "draftSegmentsDrawn": false
  }
}
```

Implementation notes for next session:

- PDF `canvasWidth` / `canvasHeight` must match the coordinate system used by `control_point.image_x` / `image_y` (see `MapAlignmentWorkspace` PDF canvas render scale).
- Map `bounds` must come from Leaflet (`map.getBounds()`) at capture time.
- Store snapshot records optionally (`agent_run` input snapshot id) for audit replay.
- Client tool runs in browser; passes result to server orchestration (`propose_features_from_overlay`) or in-app chat adapter.

### Coordinate transform tools (server)

Expose deterministic conversion so the agent never does affine math in prose:

| Tool                   | Input                            | Output                                                       |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ |
| `pdf_pixel_to_lon_lat` | `{ mapId, imageX, imageY }`      | `{ longitude, latitude }` or error if georeference not ready |
| `lon_lat_to_pdf_pixel` | `{ mapId, latitude, longitude }` | `{ imageX, imageY }` or error                                |
| `compute_georeference` | `{ mapId }`                      | Transform JSON + `residualErrorMeters`                       |

Vision proposes pixels → server confirms via `pdf_pixel_to_lon_lat` before displaying on map, or agent calls transform tool explicitly after tracing.

### Recommended workflow by task

| Task                      | Agent reads                              | Agent writes (via tools)                                                       |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Read trail names / colors | PDF PNG + legend                         | `pathKind`, `name`, `segmentGroupId` in patch metadata                         |
| Trace path geometry       | PDF PNG                                  | LineString in **`pdf-pixels`** via `apply_feature_patch`                       |
| Place reference pin       | PDF + satellite PNG + control point JSON | `create_control_point` with explicit `imageX/Y` and `latitude/longitude`       |
| Fix misaligned pin        | Fresh snapshot + existing point coords   | `update_control_point` or `suggest_control_point_adjustments` (human confirms) |
| Verify alignment          | Snapshot after pin move                  | Qualitative pass/fail in chat; optional numeric nudge via update tool          |
| Export                    | DB rows (not vision)                     | `export_geojson` after human accept                                            |

### What agents should do

- Work **one trail or one segment at a time**
- Call `get_project_context` before vision work
- Call `list_feature_segments` / `find_feature_gaps` before proposing
- Prefer **PDF pixel coordinates** for traced geometry until georeference is trusted
- Return **`apply_feature_patch`** ops (~0.5–3 KB per turn), not full collections
- Set `pathKind`, `name`, `confidence`, `source: agent-proposal`, `status: draft`
- Report uncertainty (“cannot see path between seg 2 and 3”)

### What agents should not do

- Infer lat/lng from screenshot pixels without bounds metadata or transform
- Dump the entire map in one JSON response
- Return a full FeatureCollection from vision alone
- Replace or delete human-placed control points without explicit tool + review
- Write `accepted` features directly — drafts only until human accept
- Assume sub-10 m accuracy from vision without control points + review

### Anti-patterns to avoid in implementation

| Anti-pattern                            | Why it fails                                                       |
| --------------------------------------- | ------------------------------------------------------------------ |
| Single screenshot, no bounds            | Agent cannot map pixels ↔ degrees                                  |
| Vision-only GeoJSON output              | Unstable geometry, huge payloads                                   |
| Skipping control points                 | No grounding for PDF → map conversion                              |
| Client/server duplicate transform logic | Drift between UI and agent results — **one server implementation** |
| Auto-accept agent reference moves       | Misalignment propagates to all traced trails                       |

---

## Agent loop (segmented extraction)

Recommended autonomous loop (MCP or in-app chat):

```
1. get_project_context(mapId)       ← JSON: coords, bounds, transform, gaps
2. get_rendered_map_view()          ← client: PDF + map PNGs + metadata contract
3. pick segmentGroupId with largest gap or user-requested trail
4. propose_features_from_overlay    ← vision reads PNGs; outputs pdf-pixels patch
5. pdf_pixel_to_lon_lat / server convert on write
6. repeat until find_feature_gaps → empty
7. human reviews drafts on map (drag vertices, fix refs)
8. optional verification snapshot   ← vision QA only
9. merge_feature_segments on accept
10. export_geojson when ready
```

Human can interrupt at any step: drag reference points, edit segment vertices, reject bad agent segments.

---

## Verification tools — agent checks its own work

Yes — expose **read-only and compare tools** so the agent can verify drafts before asking a human to accept. Use a mix of **deterministic server checks** (exact, cheap) and **vision snapshots** (qualitative, optional).

### Design rules

| Rule                                                                              | Why                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Verification tools are **read-only** or return **suggestions**, not silent writes | Keeps human review meaningful                   |
| Prefer **numbers first**, images second                                           | Residual error, distance, gap length are exact  |
| Return **pass / warn / fail** + evidence                                          | Agent can loop: fix → verify again              |
| Same tools for MCP, chat, and programmatic callers                                | One implementation in `geojson-tools.server.ts` |

### Example tools

#### 1. `verify_control_point_alignment` (server + optional vision)

Checks whether a control point’s map side matches its PDF side after georeference.

**Input:**

```json
{
  "mapId": 1,
  "controlPointId": 2
}
```

**Output:**

```json
{
  "status": "warn",
  "controlPointId": 2,
  "pdf": { "imageX": 1100, "imageY": 420 },
  "map": { "latitude": -1.2384, "longitude": 36.8198 },
  "predictedFromTransform": { "latitude": -1.2389, "longitude": 36.8192 },
  "offsetMeters": 18.4,
  "residualErrorMeters": 12.4,
  "message": "Map pin is 18 m from where the affine transform predicts for this PDF pixel."
}
```

Agent action: call `suggest_control_point_adjustments` or ask human to drag the pin.

---

#### 2. `verify_georeference_quality` (server, deterministic)

Runs after `compute_georeference` or when the agent finishes placing refs.

**Input:** `{ "mapId": 1 }`

**Output:**

```json
{
  "status": "pass",
  "method": "affine",
  "controlPointCount": 5,
  "residualErrorMeters": 11.2,
  "maxPointErrorMeters": 19.8,
  "readyForTracing": true,
  "message": "Residual under 15 m threshold; safe to trace in pdf-pixels."
}
```

Agent action: if `fail`, add or adjust control points before tracing trails.

---

#### 3. `verify_segment_continuity` (server, deterministic)

Checks whether segments in a trail group connect end-to-end.

**Input:**

```json
{
  "mapId": 1,
  "segmentGroupId": "10k-blue"
}
```

**Output:**

```json
{
  "status": "warn",
  "segmentGroupId": "10k-blue",
  "gaps": [
    {
      "afterSegmentIndex": 1,
      "beforeSegmentIndex": 2,
      "gapMeters": 47.3,
      "endCoord": [-1.241, 36.814],
      "startCoord": [-1.239, 36.817]
    }
  ],
  "message": "Segment 2 does not meet segment 1 within 15 m snap tolerance."
}
```

Agent action: call `apply_feature_patch` to fill the gap segment, then verify again.

---

#### 4. `verify_segment_on_pdf` (hybrid: server geometry + vision)

After tracing in pdf-pixels, checks the segment lies on the colored trail in the PDF (vision) and converts cleanly to map space (server).

**Input:**

```json
{
  "mapId": 1,
  "segmentId": 42,
  "renderedPdfSnapshotId": "snap_abc123"
}
```

**Output (deterministic part always; vision part when snapshot provided):**

```json
{
  "status": "warn",
  "segmentId": 42,
  "coordinateSpace": "pdf-pixels",
  "vertexCount": 24,
  "lengthPdfPixels": 892,
  "lengthMetersAfterTransform": 9840,
  "vision": {
    "status": "pass",
    "summary": "Polyline follows the blue loop; minor deviation at northern bend.",
    "confidence": 0.81
  },
  "message": "Length plausible for 10 km loop; vision pass with one bend warning."
}
```

Agent action: patch vertices on the bend, re-capture snapshot, verify again.

---

#### 5. `verify_feature_on_map` (hybrid: server + map snapshot)

Checks whether converted WGS84 geometry aligns with satellite features (roads, clearing edges).

**Input:**

```json
{
  "mapId": 1,
  "segmentId": 42,
  "renderedMapSnapshotId": "snap_def456"
}
```

**Output:**

```json
{
  "status": "fail",
  "segmentId": 42,
  "samplePointsChecked": 8,
  "offTrailSamples": 3,
  "maxDeviationMeters": 62,
  "vision": {
    "status": "fail",
    "summary": "Eastern third of line crosses open field; trail on imagery runs 40–60 m north.",
    "confidence": 0.76
  },
  "message": "Reject or revise segment 42 before accept."
}
```

Agent action: revise segment or nudge control points and re-run `compute_georeference`.

---

#### 6. `get_verification_snapshot` (client)

Captures fresh PNGs **after** a write so verification sees current state (markers, drafts drawn).

**Input:**

```json
{
  "mapId": 1,
  "includeOverlays": ["control_points", "draft_segments", "pending_pin"],
  "panes": ["pdf", "map"]
}
```

**Output:** Same metadata contract as `get_rendered_map_view`, plus `snapshotId` for referencing in server verify tools.

Agent loop:

```
apply_feature_patch → get_verification_snapshot → verify_segment_on_pdf / verify_feature_on_map
```

---

#### 7. `compare_before_after` (server)

Compares geometry hash / length / bbox before and after an agent edit (audit + self-check).

**Input:**

```json
{
  "mapId": 1,
  "segmentId": 42,
  "beforeRevisionId": "rev_10",
  "afterRevisionId": "rev_11"
}
```

**Output:**

```json
{
  "lengthDeltaMeters": -12.4,
  "vertexCountDelta": -2,
  "maxPointMoveMeters": 8.1,
  "bboxChanged": true,
  "message": "Simplification removed 2 vertices; max shift 8 m."
}
```

---

### Example agent self-check loop (reference pin)

```
1. create_control_point({ imageX: 1100, imageY: 420, latitude: -1.2384, longitude: 36.8198 })
2. verify_control_point_alignment({ controlPointId: 5 })
   → warn, offsetMeters: 18
3. suggest_control_point_adjustments({ controlPointId: 5 })
   → propose latitude: -1.2389, longitude: 36.8192
4. update_control_point(...)   [human confirm or policy auto-apply if under threshold]
5. verify_control_point_alignment({ controlPointId: 5 })
   → pass, offsetMeters: 2.1
6. compute_georeference({ mapId: 1 })
7. verify_georeference_quality({ mapId: 1 })
   → pass
```

### Example agent self-check loop (trail segment)

```
1. apply_feature_patch({ segmentGroupId: "10k-blue", segmentIndex: 2, coordinates: [...], coordinateSpace: "pdf-pixels" })
2. verify_segment_continuity({ segmentGroupId: "10k-blue" })
   → pass
3. get_verification_snapshot({ includeOverlays: ["draft_segments"] })
4. verify_segment_on_pdf({ segmentId: 42, renderedPdfSnapshotId: "snap_..." })
   → pass
5. pdf_pixel_to_lon_lat applied on server; segment shown on map
6. verify_feature_on_map({ segmentId: 42, renderedMapSnapshotId: "snap_..." })
   → warn on one bend
7. apply_feature_patch (adjust bend vertices)
8. verify_feature_on_map → pass
9. Human accepts segment
```

### Tool placement (client vs server)

| Tool                                    | Layer                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `verify_georeference_quality`           | Server                                                                        |
| `verify_control_point_alignment`        | Server                                                                        |
| `verify_segment_continuity`             | Server                                                                        |
| `verify_segment_on_pdf`                 | Server (+ vision input)                                                       |
| `verify_feature_on_map`                 | Server (+ vision input)                                                       |
| `compare_before_after`                  | Server                                                                        |
| `get_verification_snapshot`             | Client (capture)                                                              |
| Vision interpretation inside verify\_\* | Server orchestration calling vision model with snapshot + structured geometry |

Add these to `geojson-tool-schemas.ts` / `geojson-tools.server.ts` alongside write tools; register on MCP with read permissions where appropriate.

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
