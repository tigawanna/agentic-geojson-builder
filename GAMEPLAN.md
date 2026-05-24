# Agentic GeoJSON Builder - Phase One Plan

## Goal

Turn this workspace into a focused app that converts map images and PDFs into georeferenced, editable GeoJSON. The Karura Forest PDF is the reference case: a human can trace paths, an agent can propose drafts, and the final output is reviewable structured spatial data.

## Product Workflow

1. Create a map and upload a source PDF.
2. Pick a base map style (satellite default, outline, standard).
3. Georeference by placing control points between the PDF and real map coordinates.
4. Trace or import GeoJSON features on top of the aligned overlay.
5. Let an agent inspect the overlay and base map to propose draft paths, labels, and feature properties.
6. Review, edit, validate, and export a GeoJSON FeatureCollection.

## Implementation status (maps module)

| Module (plan)    | Current code                  | Status                                |
| ---------------- | ----------------------------- | ------------------------------------- |
| `projects`       | `map` table + `/maps` routes  | Done (named `map`, not `map_project`) |
| `assets`         | PDF in `map.pdf_data` bytea   | Done (single PDF per map)             |
| `georeferencing` | `control_point` + UI workflow | Done (no affine transform yet)        |
| `features`       | —                             | Not started                           |
| `editor-session` | Workspace prefs on `map` row  | Partial (viewport, PDF transform)     |
| `agent-runs`     | —                             | Not started                           |
| `exports`        | —                             | Not started                           |

Routes: **`/maps`**, not `/map-projects`. Persistence: **Postgres**, not browser PGLite.

Details: [`docs/map-workspace-features.md`](docs/map-workspace-features.md) · Next steps: [`TODOS.md`](TODOS.md)

## Core TypeScript Modules (target)

| Module           | Responsibility                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `projects`       | Project metadata, source asset records, status, ownership           |
| `assets`         | PDF/image upload, rendered page images, dimensions, storage keys    |
| `georeferencing` | Control points, transform method, residual error, overlay bounds    |
| `features`       | GeoJSON features, labels, path types, review status, confidence     |
| `editor-session` | Draft edits, undo/redo history, current selection, layer visibility |
| `agent-runs`     | Agent requests, proposed features, provenance, acceptance state     |
| `exports`        | GeoJSON snapshots and later GPX/vector tile outputs                 |

Keep shared schemas in `packages/isomorphic` with Zod v4.

## Map And GIS Tooling

- **Map display:** Leaflet in `MapAlignmentWorkspace` + `map-handle.ts`
- **Drawing/editing:** Leaflet-Geoman or Leaflet.Draw (planned for trace mode)
- **Geometry validation:** `@turf/turf` (planned)
- **PDF rasterization:** PDF.js client-side, page 1 at 1.5× scale
- **Coordinate transforms:** affine from 3+ control points (planned)

## Human Tools

Implemented today — see [`docs/map-workspace-features.md`](docs/map-workspace-features.md):

- Upload PDF, base map styles, control points, paste Google Maps coords
- Drag refs on PDF and map, edit/delete, workspace auto-save

Not yet:

- Draw/trace LineString features, export GeoJSON, multi-page PDF

## Agent Tools

Agent tools should be thin wrappers around the same project state used by the UI. Several **UI server functions already exist**; MCP/agent registration is Phase 2.

| Tool                                          | Purpose                   | UI server today? |
| --------------------------------------------- | ------------------------- | ---------------- |
| `list_maps` / `get_map_workspace` / CRUD maps | Map workspace             | Yes              |
| `list_control_points` / CRUD control points   | Georeferencing            | Yes              |
| `get_project_context`                         | Agent context JSON        | No               |
| `get_rendered_map_view`                       | PDF + map PNGs + metadata | No               |
| `compute_georeference` / transform tools      | PDF ↔ WGS84               | No               |
| `apply_feature_patch`                         | Draft segments            | No               |
| `propose_features_from_overlay`               | Vision tracing            | No               |

Full inventory: [`TODOS.md`](TODOS.md). Vision vs coordinates: [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md).

Expose agent tools through `features/agentic-tools/` + oRPC + MCP (mirror json-resume).

## AI Chat Direction

TanStack AI with OpenRouter. Tool-first, project-aware, draft-only writes. Route: `routes/api/ai/map-assistant.ts` (planned).

## Data Model

### Implemented (Postgres)

- `map`: `owner_id`, name, viewport, PDF transform, `pdf_data`, etc.
- `control_point`: `map_id`, `image_x`, `image_y`, PostGIS `location`

### Planned

- `georeference`: transform JSON, residual error
- `geo_segment`: chunked agent patches
- `geo_feature`: merged accepted geometry
- `agent_run`: audit trail

Schema changes via Drizzle only (`pnpm --filter web db:generate`).

## Cleanup Notes

Copied app code lives under `legacy/`. Active workspace: `apps/web` + `packages/*`. PGLite removed from web app; server Postgres is authoritative.
