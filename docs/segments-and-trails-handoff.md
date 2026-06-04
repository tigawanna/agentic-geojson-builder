# Segments & trails — handoff

Handoff for continuing **marker → segment → trail → route** work on the desktop app (`apps/desktop`). This layer sits on top of traced paths (`geo_segment`) and routing markers (`map_point`).

**Status:** Core backend, Data Explorer UI, workspace build panel, MCP tools, and unit tests are in place. Trail member assignment UI and “save route as trail” are still thin.

**Related:** [`segments-and-trails-plan.md`](segments-and-trails-plan.md) (full plan) · [`karura-trail-drawing-handoff.md`](karura-trail-drawing-handoff.md) · [`desktop-app-handoff.md`](desktop-app-handoff.md) · [`agent-control-point-placement.md`](agent-control-point-placement.md)

---

## Vocabulary (do not mix these up)

| What you see on the map                      | DB table                        | Used for                                                           |
| -------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Green circle, number inside                  | `control_point`                 | PDF ↔ map **reference** / georeference only                        |
| Diamond pin + white label (e.g. `23`, `23a`) | `map_point`                     | **Routing markers** — segments, links, trails, routes              |
| Coloured dashed lines                        | `geo_segment`                   | **Drawn path ink** (`segmentGroupId` = path slug, e.g. `10k-blue`) |
| Logical edge `23 → 23a` along a path         | `segment_edge` (was `map_link`) | **Path segment** — graph topology between marker refs              |
| Named route made of edges                    | `trail` + `trail_member`        | Ordered list of segment edges                                      |

**Segmentation rule:** contiguous markers on one path → one edge; **break at junctions/endpoints** (`node_role` or category `junction` / `gate`).

---

## What works today

| Area              | What                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**        | Migration `0009`: `map_point.node_role`, `map_link` → `segment_edge` (+ geometry, length, kind, status), `trail`, `trail_member` |
| **Algorithms**    | `segmentation.ts` (build edges from markers on a path), `route-graph.ts` (Dijkstra + via refs)                                   |
| **IPC**           | `segments:*`, `trails:*`, `routing:*`; legacy `mapLinks:*` still works                                                           |
| **Data Explorer** | Tabs: **Path segments** (build + table), **Trails** (create + list), **Route** (find route)                                      |
| **Workspace**     | Controls → **Markers & segments** (build from path, list edges)                                                                  |
| **Marker edit**   | `nodeRole` on `MapPointDetailPanel` + Data Explorer edit dialog                                                                  |
| **Link tool**     | Chain icon links **two routing markers** (both need `ref`); warns if you click reference points                                  |
| **MCP**           | `build_segments_from_path`, `find_route`, `list_path_segments`, `list_trails`, etc.                                              |
| **Tests**         | `apps/desktop/tests/unit/segmentation.test.ts`, `route-graph.test.ts` (6 tests)                                                  |

---

## How to use it (Karura-style workflow)

### Prerequisites

1. Restart desktop app once so migration **`0009_segments_and_trails.sql`** runs.
2. **Trace** the path first (Trace trail tool) → creates `geo_segment` rows with a `segmentGroupId`.
3. Place **routing markers** with the **pin tool** (not reference / green circles).
4. Give each marker a **`ref`** (e.g. `23`, `23a`) and set **node role** `junction` or `endpoint` (or category `junction` / `gate`) at breaks and ends.

### Build path segments (marker → edges)

**Option A — Data Explorer**

1. Sidebar → **Data** → open map.
2. Tab **Path segments**.
3. Choose path slug → **Preview** → **Build segments from markers**.

**Option B — Workspace**

1. Map → **Controls** (grid) → **Markers & segments**.
2. Same build panel at top.

### Plan a route

1. Data Explorer → tab **Route**.
2. Select **From** / **To** refs (optional **Via**: `23a, 25`).
3. **Find route** — map fits bounds; steps listed in panel.

### Create a trail (shell only)

1. Data Explorer → tab **Trails**.
2. Enter slug + name → **Create trail**.
3. Members are **not** assignable in UI yet — use `trails:setMembers` via IPC or add composer tomorrow.

### Manual link (two markers only)

1. Map toolbar → **chain / link** tool.
2. Click two **diamond** markers (must have `ref`).
3. Does **not** auto-build all markers on a path — use **Build segments** for that.

---

## IPC channels (renderer ↔ main)

| Channel                                                             | Purpose                                            |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| `segments:list`                                                     | List `segment_edge` rows                           |
| `segments:previewBuildFromPath`                                     | Preview proposals for a `pathSlug`                 |
| `segments:buildFromPath`                                            | Commit edges (`replaceExisting` optional)          |
| `segments:create` / `update` / `delete`                             | Manual edge CRUD                                   |
| `segments:createFromPoints`                                         | Link two `map_point` ids onto nearest path         |
| `trails:list` / `trails:create` / `trails:update` / `trails:delete` | Trail CRUD                                         |
| `trails:setMembers`                                                 | Ordered `{ segmentEdgeId, orderIndex, direction }` |
| `routing:findRoute`                                                 | `{ mapId, fromRef, toRef, viaRefs? }`              |
| `routing:reachableFrom`                                             | Reachable nodes from a ref                         |
| `mapLinks:*`                                                        | Alias of segment edge ops (backward compatible)    |

Events: `segments:changed`, `trails:changed`, `mapLinks:changed` (invalidates queries).

---

## MCP tools (agents)

Registered in `register-segment-trail-tools.ts`:

| Tool                               | Notes                                                        |
| ---------------------------------- | ------------------------------------------------------------ |
| `list_path_segments`               | Topology edges (not `geo_segment` ink)                       |
| `preview_build_segments_from_path` | Dry run                                                      |
| `build_segments_from_path`         | `pathSlug`, `replaceExisting`, `maxProjectionDistanceMeters` |
| `list_trails`                      | Trails + members                                             |
| `find_route`                       | Shortest path over accepted edges                            |
| `reachable_from_marker`            | BFS from a ref                                               |

Existing map tools still apply: `list_map_points`, `create_map_link`, `list_feature_segments` (drawn geometry), etc.

---

## Key file paths

| Layer            | Path                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan             | `docs/segments-and-trails-plan.md`                                                                                                                                     |
| Migration        | `apps/desktop/drizzle-pglite/migrations/0009_segments_and_trails.sql`                                                                                                  |
| Schemas          | `apps/desktop/src/main/lib/pglite/schema/segment-edge.schema.ts`, `trail.schema.ts`, `map-point.schema.ts`                                                             |
| Segmentation     | `apps/desktop/src/main/lib/geojson/segmentation.ts`                                                                                                                    |
| Routing          | `apps/desktop/src/main/lib/routing/route-graph.ts`                                                                                                                     |
| Services         | `segment-edges.service.ts`, `trails.service.ts`, `routing.service.ts`                                                                                                  |
| IPC              | `apps/desktop/src/main/ipc/segments.ts`, `trails.ts`, `routing.ts`                                                                                                     |
| IPC contract     | `apps/desktop/src/shared/ipc-contract.ts`                                                                                                                              |
| Types            | `segments.types.ts`, `trails.types.ts`, `routing.types.ts`                                                                                                             |
| Data Explorer UI | `MapDataExplorerPage.tsx`, `MapDataExplorerTables.tsx`, `MapDataExplorerBuildSegmentsPanel.tsx`, `MapDataExplorerRoutePanel.tsx`, `MapDataExplorerCreateTrailForm.tsx` |
| Workspace UI     | `MapMarkersSection.tsx`, `MapPointDetailPanel.tsx`                                                                                                                     |
| MCP              | `apps/desktop/src/main/mcp/tools/register-segment-trail-tools.ts`                                                                                                      |
| Hooks            | `useSegmentsQuery.ts`, `useTrailsQuery.ts`, `useMapLinksQuery.ts`                                                                                                      |
| Tests            | `apps/desktop/tests/unit/segmentation.test.ts`, `route-graph.test.ts`                                                                                                  |

---

## Commands

```bash
cd apps/desktop
pnpm dev                    # run app
pnpm check-types            # TS
pnpm test                   # unit tests (segmentation + route-graph)
```

**Note:** `pnpm db:pglite:generate` may fail locally (Drizzle Kit cannot resolve `@main` path aliases). Migration `0009` was added manually; if you change schemas, regenerate in an env where generate works or hand-write the next migration to match Drizzle output.

---

## Known issues / gotchas

1. **Path segment UX is interim** — Link mode + Controls build panel work but are not the final workflow; see [UX roadmap](#ux-roadmap--path-segment-creation-needs-redesign) below.
2. **Link tool vs reference points** — Green circles are `control_point`; link mode shows a message and does nothing useful for routing. Use **pin tool** markers.
3. **Build segments empty** — Usually: no traced path for slug, markers lack `ref`, or markers are not junction/gate/node_role (skipped). Check preview message.
4. **Find route not found** — No `segment_edge` rows, disconnected graph, or refs not on the graph. Build segments first.
5. **Tab naming** — **Drawn paths** = `geo_segment` ink; **Path segments** = `segment_edge` topology (old name was “Links”).
6. **`map_link` renamed** — DB table is `segment_edge`; code still exposes `mapLinks:*` for compatibility.

---

## UX roadmap — path segment creation (needs redesign)

**Problem today:** Path segment creation feels wonky. Link mode only connects **two** markers per action, targets are small on a busy map (Karura has dozens of white labels), there is **no side panel**, and **Build segments from path** lives buried in Controls / Data Explorer instead of the natural map workflow.

**Target experience when Link mode is on:**

| #   | Requirement                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Side panel opens automatically** when link mode is toggled (workspace split: map + **Segment composer** panel). Closing link mode or toggling off collapses it.                                                            |
| 2   | **Chain list** in the panel — ordered markers in the current path being built (not just the last pair). User sees `23 → 23a → 25 → …` as they add.                                                                           |
| 3   | **Proximity suggestions** — after selecting a marker, panel shows **“Next marker”** candidates sorted by distance along the traced path (or haversine if off-path), excluding already-chained refs. One click adds to chain. |
| 4   | **Bigger hit targets** — routing markers use larger pins / padding in link mode; optional hover halo; selected + “link source” states more visible at forest zoom levels.                                                    |
| 5   | **Join more than two** — **Finish chain** creates one `segment_edge` per consecutive pair in the list (or one merged edge if product chooses), instead of resetting after every second click.                                |
| 6   | **Path context** — panel picks active `pathSlug` (dropdown, same as build panel) so edges attach to the correct traced loop.                                                                                                 |
| 7   | **Connected markers hint** — show existing `segment_edge` rows that touch the current marker so user can extend an existing chain.                                                                                           |

**Implementation sketch (for tomorrow):**

- State: `linkChain: number[]` (map_point ids), `linkPathSlug`, panel open flag tied to `linkMode`.
- Suggestions: project all markers onto combined geometry for `pathSlug`; sort by fraction delta from current marker; filter refs already in chain.
- UI: new `MapLinkComposerPanel.tsx` in workspace split (mirror `MapPointDetailPanel` / tools slide-in).
- Map: increase `divIcon` size in `LeafletMapPane` / Mapbox when `linkMode`; highlight chain members + suggestions on hover.
- IPC: batch `segments:createFromPoints` in loop on finish, or new `segments:createChainFromPoints` service.

**Deprecate / hide:** pairwise-only flow that clears after two clicks without surfacing the chain in UI.

---

## Not done yet (good tasks for tomorrow)

| Priority     | Task                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | **Link mode segment composer** — side panel, proximity suggestions, bigger targets, multi-marker chain (see UX roadmap above) |
| High         | **Trail member composer** — UI to assign/reorder `segment_edge` ids into a trail (`trails:setMembers`)                        |
| High         | **Save route as trail** — button on Route tab after `findRoute`                                                               |
| Medium       | MCP prompt/skill: `.cursor/skills/desktop-segment-trail-composition/` + guide resource                                        |
| Medium       | Integration tests (IPC round-trip or service + PGlite)                                                                        |
| Medium       | Junction **exit labels** / bearing on edges (`exitLabel`, auto `exitBearingDeg`) + small d-pad UI on marker detail            |
| Low          | `set_trail_members` MCP tool                                                                                                  |
| Low          | Fix `db:pglite:generate` (relative imports in schema for Drizzle Kit)                                                         |
| Low          | Rename Data Explorer tab keys in i18n if “links” confuses (`pathSegments` vs `links`)                                         |

---

## Suggested validation on Karura map

1. Open Karura map with traced loop (e.g. one `segmentGroupId`).
2. Ensure pin markers `23`, `23a`, … with refs + junction roles on the loop.
3. **Path segments** → build → confirm edges in table.
4. **Route** → `23` → `40a` (or similar) → confirm path on map.
5. Create trail slug `10k-blue-test` → (tomorrow) attach built edges as members.

---

## Success criteria for “segments & trails v1”

- [ ] One full loop has **path segments** built from markers without manual pairwise linking.
- [ ] **Find route** returns a sensible path between two known refs on that loop.
- [ ] At least one **trail** has ordered members in the UI (not only via IPC).
- [ ] Agent can run `build_segments_from_path` + `find_route` via MCP on the same map.

When v1 feels solid, consider exit-direction labels at junctions (see plan § future).
