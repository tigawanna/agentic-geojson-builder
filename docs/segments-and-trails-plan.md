# Segments & Trails — plan and execution

Plan for the **next sub-feature**: join markers into **segments**, compose segments into **trails**, and traverse the resulting graph to answer _"from where I am, which path do I take to reach my destination marker?"_.

This is a **trail-mapping sub-feature**. The core product (georeferenced PDF, markers/control points, drawn geometry) is already accomplished. This layer adds **topology and routing** on top of what exists.

**Status:** Phases 1–3 implemented in desktop (schema migration `0009`, IPC, segmentation + routing algorithms). Phase 5 UI (split-view composer) not started.

**Related:** [`karura-trail-drawing-handoff.md`](karura-trail-drawing-handoff.md) · [`desktop-app-handoff.md`](desktop-app-handoff.md) · [`agent-digitization-design.md`](agent-digitization-design.md) · [`../TODOS.md`](../TODOS.md) · [`apps/desktop/docs/02-architecture.md`](../apps/desktop/docs/02-architecture.md) · [`apps/desktop/docs/03-ipc.md`](../apps/desktop/docs/03-ipc.md)

---

## 1. Concept and vocabulary

We model the map as a **graph of paths**. Two layers sit on top of the drawn ink:

| User term          | Meaning                                                                                                                             | Backing entity                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Marker**         | A labeled point on the map (e.g. `37`, `42b3`, a gate, a junction). Already placed.                                                 | `map_point` (routing marker / POI) and `control_point` (PDF↔map georeference) |
| **Node**           | A marker that participates in routing — specifically a **junction** (3+ paths meet) or an **endpoint** (dead end / gate).           | `map_point` flagged as a node                                                 |
| **Segment**        | A **continuous, uninterrupted run of path between two adjacent nodes**, with no intervening junction. The atomic edge of the graph. | `segment_edge` (see model) backed by a slice of `geo_segment` geometry        |
| **Trail**          | A **named, ordered route** built from one or more segments (e.g. `10k-blue` loop, "drive home").                                    | `trail` + `trail_member`                                                      |
| **Drawn geometry** | The raw LineString ink the user/agent traces. Grouped by `segmentGroupId`.                                                          | `geo_segment` (already exists)                                                |

### The segmentation rules (the user's mental model, made precise)

1. A **segment is contiguous**: joining a run of markers along one uninterrupted path produces **one** segment, no matter how many markers it spans. Seven markers on one straight path → one segment.
2. A **segment breaks at an intersection**: where a path meets another path (a junction node), the current segment **ends** at that node, and **one new segment starts per outgoing branch**.
   - 2-way continuation at a junction → existing segment ends, 1 new segment starts (still a junction if other paths also touch it).
   - A 3-way junction → 3 segments touch that node.
3. **Endpoints** (gates, dead ends) also terminate segments.
4. A **trail** is an ordered chain of segments. Trails may share segments (a segment can belong to many trails).

> Invariant: **every segment endpoint is a node** (junction or endpoint). Nodes are the only places segments may start or stop.

---

## 2. What exists today (do not rebuild)

| Capability               | Where                                                                                        | Notes                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markers placed on map    | `map_point` table, `MapPointDetailPanel`, `mapPoints:*` IPC, `*_map_point_tools` MCP         | Has `ref`, `category` (junction/gate/viewpoint/…), `location`, `parentRef`.                                                                                                                                                      |
| Control points (georef)  | `control_point` table, `controlPoints:*` IPC                                                 | Distinct from routing markers.                                                                                                                                                                                                   |
| Drawn geometry           | `geo_segment` (`segmentGroupId`, `segmentIndex`, `geometryJson` LineString, `status`)        | The "ink". CRUD + patch + export + gaps + merge-preview already done.                                                                                                                                                            |
| **Edge primitive**       | `map_link` (`fromRef`, `toRef`, `pathSlug`, `startFraction`, `endFraction`, `bidirectional`) | **This is already a graph edge between two markers along a path.** Geometry is referenced by fraction into the combined `segmentGroupId` geometry. `createMapLinkFromPoints` already projects two markers onto the nearest path. |
| Fraction-along-line math | `apps/desktop/src/main/lib/geojson/line-fraction.ts`                                         | `projectPointFractionOnLine`, `combineGroupCoordinates`.                                                                                                                                                                         |
| Segment gaps / merge     | `apps/desktop/src/main/lib/geojson/segment-gaps.ts`, `merge-segments.ts`                     | Detect unconnected endpoints; merge group into one feature.                                                                                                                                                                      |
| Distance                 | `apps/desktop/src/main/lib/georeference/affine.ts` → `haversineDistanceMeters`               | Reuse for edge weights.                                                                                                                                                                                                          |
| Data explorer            | `/data/$mapId/` tabs: `points \| segments \| paths \| links \| history`                      | Natural home for a richer composer.                                                                                                                                                                                              |
| Workspace split view     | `MapWorkspaceSplitView.tsx`, `LeafletMapPane.tsx`, `MapboxGlWorkspacePane.tsx`               | Reuse the map pane in the new editor.                                                                                                                                                                                            |

**Key insight:** `map_link` is already 80% of a "segment edge". The remaining work is to (a) constrain edges to be **node-to-node and junction-bounded**, (b) give them identity/geometry/length for routing, and (c) add a **trail** layer plus **graph traversal**.

---

## 3. Domain model (recommended)

Two thin layers over `geo_segment`:

```
map_point (NODE)  ──< segment_edge >──  map_point (NODE)
                              │
                        (geometry slice of geo_segment by fraction)
                              │
                     trail_member (ordered) ──> trail (named route)
```

### 3.1 Nodes — reuse `map_point`

No new table. A marker becomes a routing node when it is a junction or endpoint. Add to `map_point.metadata` (or a typed column) a `nodeRole`:

- `junction` — 3+ segments meet.
- `endpoint` — gate / dead end / trailhead.
- `waypoint` — lies along a segment, not a break (informational only).

> Decision needed (D1): typed column `node_role` vs `metadata.nodeRole`. Recommend a typed `node_role varchar(16)` for indexing and graph queries.

### 3.2 Segments — new `segment_edge` (evolve `map_link`)

Recommended path: **promote `map_link` into the segment edge** rather than create a parallel table, then layer trails on top. The edge gains a stable identity and a resolved geometry so routing does not need to re-derive fractions every call.

Proposed `segment_edge` columns (superset of today's `map_link`):

| Column                            | Type               | Purpose                                                                            |
| --------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `id`                              | identity PK        | Stable segment identity (referenced by trails and routes).                         |
| `map_id`                          | FK → `map`         | Scope.                                                                             |
| `from_ref` / `to_ref`             | varchar(64)        | Node marker refs (must be `node_role` junction/endpoint).                          |
| `path_slug`                       | varchar(128)       | Source `geo_segment.segmentGroupId` the geometry came from.                        |
| `start_fraction` / `end_fraction` | real               | Position along the combined path (kept for re-slicing / editing).                  |
| `geometry_json`                   | jsonb `LineString` | **Resolved** WGS84 geometry of just this segment (cached slice).                   |
| `length_m`                        | real               | Cached haversine length — the default routing weight.                              |
| `kind`                            | varchar(32)        | `walking-trail` / `bike-path` / `service-road` / … (mirrors `GeoSegmentPathKind`). |
| `bidirectional`                   | boolean            | Direction of travel allowed.                                                       |
| `status`                          | varchar(32)        | `draft` → `needs-review` → `accepted`.                                             |
| `metadata`                        | jsonb              | Surface, difficulty, notes.                                                        |
| `created_at` / `updated_at`       | timestamp          |                                                                                    |

> Decision needed (D2): **migrate `map_link` → `segment_edge`** (rename + add columns) vs **add `segment_edge` alongside** and deprecate `map_link`. Recommend a Drizzle migration that renames and extends, since `map_link` has no large production data and the concept is the same edge.

### 3.3 Trails — new `trail` + `trail_member`

`trail` (named route):

| Column     | Type         | Purpose                                      |
| ---------- | ------------ | -------------------------------------------- |
| `id`       | identity PK  |                                              |
| `map_id`   | FK → `map`   |                                              |
| `slug`     | varchar(128) | Stable name e.g. `10k-blue`, unique per map. |
| `name`     | varchar(255) | Display name.                                |
| `kind`     | varchar(32)  | loop / out-and-back / connector / route.     |
| `color`    | varchar(16)  | Matches PDF legend.                          |
| `status`   | varchar(32)  | draft / accepted.                            |
| `metadata` | jsonb        | Distance summary, legend ref, etc.           |

`trail_member` (ordered membership, many-to-many):

| Column            | Type                   | Purpose                                                                      |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `id`              | identity PK            |                                                                              |
| `trail_id`        | FK → `trail` (cascade) |                                                                              |
| `segment_edge_id` | FK → `segment_edge`    | A segment can belong to many trails.                                         |
| `order_index`     | integer                | Order along the trail.                                                       |
| `direction`       | varchar(8)             | `forward` / `reverse` (traverse the segment's geometry forward or reversed). |

Unique `(trail_id, order_index)`.

---

## 4. Algorithms

### 4.1 Segmentation — "join markers into segments, break at intersections"

Input: one `segmentGroupId`'s combined geometry + the ordered node markers projected onto it (junction/endpoint roles).

```
1. Project each node marker onto the path → fraction (reuse projectPointFractionOnLine).
2. Sort nodes by fraction along the path.
3. Walk consecutive node pairs (n_i, n_{i+1}):
     - slice path coordinates between fraction(n_i)..fraction(n_{i+1})
     - emit a segment_edge(from=n_i.ref, to=n_{i+1}.ref, geometry=slice, length=haversine)
4. A node touched by segments from >1 path (or >2 segments total) is a junction.
```

Edge cases to handle: loops (start == end marker), markers off the path (distance > tolerance → skip / warn), multiple paths crossing at one coordinate (shared node by snapping within tolerance, reuse `segment-gaps` tolerance idea).

New helper: `apps/desktop/src/main/lib/geojson/segmentation.ts`.

### 4.2 Graph traversal — "which path takes me home?"

Build an undirected/directed adjacency from `segment_edge` (respect `bidirectional`), weight = `length_m` (default) or `metadata` cost.

```
nodes  = distinct from_ref/to_ref of segment_edges (map_points with node_role)
edges  = segment_edge rows (bidirectional → both directions)
route(startRef, endRef) = Dijkstra over edges by length_m
        → ordered [segment_edge_id...], total distance, node sequence [refs...],
          merged geometry (FeatureCollection / single LineString)
```

- Library: implement a small typed Dijkstra (KISS, no heavy dep) in `apps/desktop/src/main/lib/routing/route-graph.ts`. Optionally allow "must pass through" intermediate markers (the user's "pick a marker in the middle") by chaining shortest paths start→via→…→end.
- Output is itself a candidate **trail** (can be saved via `trail` + `trail_member`).

New helpers: `route-graph.ts` (graph build + Dijkstra), `routing.service.ts` (orchestrates, resolves refs, returns geometry).

---

## 5. IPC contract additions

Add channels to `apps/desktop/src/shared/ipc-contract.ts`, handlers under `apps/desktop/src/main/ipc/`, services under `apps/desktop/src/main/lib/pglite/`. Follow the existing `geoSegments:*` / `mapLinks:*` patterns and emit `*:changed` events for query invalidation.

| Channel                                                             | Purpose                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `segments:list`                                                     | List `segment_edge` for a map (filter by node, kind, status).                            |
| `segments:create` / `segments:update` / `segments:delete`           | Manual edge CRUD.                                                                        |
| `segments:buildFromPath`                                            | Run segmentation on a `segmentGroupId` → materialize edges (preview + commit).           |
| `segments:splitAtMarker`                                            | Break one segment at a marker (creates a junction node + 2 edges).                       |
| `segments:joinAdjacent`                                             | Merge two edges that share a non-junction node.                                          |
| `segments:changed` (event)                                          | Invalidate.                                                                              |
| `trails:list` / `trails:create` / `trails:update` / `trails:delete` | Trail CRUD.                                                                              |
| `trails:setMembers`                                                 | Replace/reorder a trail's ordered segments.                                              |
| `trails:changed` (event)                                            | Invalidate.                                                                              |
| `routing:findRoute`                                                 | `{ mapId, fromRef, toRef, viaRefs?, weight? }` → ordered segments + distance + geometry. |
| `routing:reachableFrom`                                             | `{ mapId, fromRef }` → nodes/segments reachable (for UI affordances).                    |

Shared types: `apps/desktop/src/shared/segments.types.ts`, `trails.types.ts`, `routing.types.ts`.

---

## 6. Agent / MCP surface

Register a new tool module `apps/desktop/src/main/mcp/tools/register-segment-trail-tools.ts` and a guide module, then call from `create-desktop-mcp-server.ts`. Reuse the same main-process services as IPC and call `broadcastToRenderers` after mutations (per the established pattern). Agents pre-build segments/trails so routes are available later.

| Tool (snake_case)                                     | Maps to                  | Use                                                                         |
| ----------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `list_segments`                                       | `segments:list`          | Inspect existing graph edges.                                               |
| `build_segments_from_path`                            | `segments:buildFromPath` | Auto-segment a traced path at its junction markers.                         |
| `create_segment`                                      | `segments:create`        | Join two markers into one segment explicitly.                               |
| `split_segment_at_marker`                             | `segments:splitAtMarker` | Break a segment where a new junction is found.                              |
| `list_trails` / `create_trail` / `set_trail_segments` | `trails:*`               | Compose/curate named routes.                                                |
| `find_route`                                          | `routing:findRoute`      | "Given start + destination (+ via) markers, return the segments to follow." |
| `get_segments_and_trails_guide`                       | resource/prompt          | Long-form workflow (mirror `register-segment-drawing-guide.ts`).            |

Add a Cursor skill folder `.cursor/skills/desktop-segment-trail-composition/` mirroring the existing `desktop-trail-segment-drawing` skill, once the tools land.

> Reuse the existing `compute_reference_intersections` / `snap_to_reference` tools to find where paths cross before segmentation.

---

## 7. UI — Segments & Trails editor

No new top-level app section. Two integration points, both **split view: list on one side, live map on the other** (reuse `ResizablePanelGroup` + the existing map pane, as `MapDataExplorerPage` already does).

### 7.1 Primary: extend the Data Explorer (`/data/$mapId/`)

The explorer already has `segments`, `paths`, and `links` tabs and a map panel (`MapDataExplorerMapPanel`). Evolve it into the composer:

- **Segments tab** → list `segment_edge` rows; selecting one highlights its geometry + its two node markers on the map. Inline split/join/edit actions.
- **Trails tab** (new, or rework `paths`) → left: trail list + ordered segment members (drag to reorder, toggle direction); right: map renders the assembled trail. An **"add segment"** flow: click segments on the map to append them to the trail.
- **Route tool** → pick a start marker and destination marker (and optional via markers) from the map or a dropdown; call `routing:findRoute`; render the route; offer **"Save as trail"**.

### 7.2 Secondary: workspace affordance

In `MapWorkspaceSplitView`, add a "Segment this path" action on a selected drawn path that calls `build_segments_from_path` and shows the resulting edges as an overlay before commit.

UI conventions: shadcn for components, DaisyUI only for theme utilities, `data-test` attributes, presentation-only components with logic in hooks (`useSegmentsQuery`, `useTrailsQuery`, `useRouteFinder`), types in a `types/` folder, no inline `any`. Follow `CLAUDE.md`.

---

## 8. Execution plan (phased)

Each phase ends with `vp check --fix` and is independently shippable. Drizzle schema → migration via Drizzle commands only (never hand-edit SQL).

### Phase 0 — Decisions & doc sign-off

- [x] D1: typed `node_role` on `map_point`.
- [x] D2: `map_link` renamed to `segment_edge` (migration `0009`).
- [x] D3: route weight = `length_m`.
- [x] D4: trails use `trail_member` with `order_index` + `direction`.

### Phase 1 — Data model

- [x] `node_role` on `map_point`.
- [x] `segment_edge` (renamed from `map_link` + geometry/length/kind/status/metadata).
- [x] `trail` + `trail_member`.
- [x] Shared types: `segments.types.ts`, `trails.types.ts`, `routing.types.ts`.

### Phase 2 — Core algorithms (pure, testable)

- [x] `lib/geojson/segmentation.ts`.
- [x] `lib/routing/route-graph.ts`.
- [ ] Unit tests (AAA, happy/edge/failure).

### Phase 3 — Services + IPC

- [x] `segment-edges.service.ts`, `trails.service.ts`, `routing.service.ts`.
- [x] IPC: `segments:*`, `trails:*`, `routing:*` (+ legacy `mapLinks:*`).
- [ ] Integration tests for service ↔ DB and IPC round-trips.

### Phase 4 — Agent / MCP

- [ ] `register-segment-trail-tools.ts` + guide resource/prompt.
- [ ] Wire into `create-desktop-mcp-server.ts`; `broadcastToRenderers` on mutations.
- [ ] `.cursor/skills/desktop-segment-trail-composition/`.

### Phase 5 — UI (split view)

- [ ] Query hooks: `useSegmentsQuery`, `useTrailsQuery`, `useRouteFinder`.
- [ ] Data Explorer: real Segments tab actions + Trails composer + Route tool ("Save as trail").
- [ ] Workspace "Segment this path" affordance.
- [ ] `data-test` attributes; component/hook tests.

### Phase 6 — Docs & polish

- [ ] Update `docs/README.md`, `TODOS.md`, `karura-trail-drawing-handoff.md` cross-links.
- [ ] Worked example: segment one Karura loop, build the `10k-blue` trail, route between two markers.

---

## 9. Out of scope (YAGNI for now)

- Turn-by-turn voice/navigation, ETA, live GPS following.
- Elevation-aware or time-based routing costs (keep weight = distance; `metadata` leaves room later).
- Wiring `karura_trails` reference catalog into routing (reference overlay only).
- Web-app parity for segments/trails (desktop-first; revisit if cloud sync is needed).

---

## 10. Open questions

| ID  | Question                                                                                    | Recommendation                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D1  | Node role: typed column vs metadata?                                                        | Typed `node_role` for indexing.                                                    |
| D2  | `map_link` → `segment_edge`: migrate or add new?                                            | Migrate + extend (same concept, no large data).                                    |
| D3  | Default routing weight?                                                                     | `length_m` (haversine); allow override later.                                      |
| D4  | Can a segment belong to many trails?                                                        | Yes — `trail_member` join confirms this.                                           |
| D5  | Where do junctions come from — manual marker flagging or auto-detected from path crossings? | Support both: auto-detect via `compute_reference_intersections` + manual override. |
