# Agentic GeoJSON Builder - Phase One Plan

## Goal

Turn this copied full-stack TypeScript workspace into a focused foundation for an app that converts map images and PDFs into georeferenced, editable GeoJSON. The Karura Forest PDF is the reference case: a human can trace paths, an agent can propose drafts, and the final output is reviewable structured spatial data.

## Product Workflow

1. Create a project and upload a source map image or PDF.
2. Pick a base map mode: Leaflet/OpenStreetMap first, optional Google Maps when imagery or labels help more.
3. Georeference the source asset by placing control points between the image and real map coordinates.
4. Trace or import GeoJSON features on top of the aligned overlay.
5. Let an agent inspect the overlay and base map to propose draft paths, labels, and feature properties.
6. Review, edit, validate, and export a GeoJSON FeatureCollection.

## Core TypeScript Modules

| Module           | Responsibility                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `projects`       | Project metadata, source asset records, status, ownership           |
| `assets`         | PDF/image upload, rendered page images, dimensions, storage keys    |
| `georeferencing` | Control points, transform method, residual error, overlay bounds    |
| `features`       | GeoJSON features, labels, path types, review status, confidence     |
| `editor-session` | Draft edits, undo/redo history, current selection, layer visibility |
| `agent-runs`     | Agent requests, proposed features, provenance, acceptance state     |
| `exports`        | GeoJSON snapshots and later GPX/vector tile outputs                 |

Keep shared schemas in `packages/isomorphic` with Zod v4. Client and server code should import the same schema types instead of duplicating contracts.

## Map And GIS Tooling

- **Map display:** Leaflet via React bindings or direct Leaflet integration inside a route component.
- **Drawing/editing:** start with Leaflet-Geoman or Leaflet.Draw; prefer a proven editor over hand-written vertex math.
- **Geometry validation:** `@turf/turf` modules for bounds, length, simplification, nearest point, line splitting, and sanity checks.
- **PDF rasterization:** server-side Poppler or PDF.js rendering into page images; keep originals and rendered previews separate.
- **Coordinate transforms:** start with affine transform from 3+ control points; later add thin plate spline or projective transform if scans are warped.
- **Elevation:** optional later pass using a DEM/elevation API per traced LineString, stored as derived metadata rather than blocking initial tracing.

## Human Tools

- Upload PDF/image.
- Choose base map provider.
- Add/edit georeferencing control points.
- Draw Point, LineString, Polygon, and MultiLineString features.
- Snap vertices, split/merge paths, simplify geometry, and edit properties.
- Toggle overlay opacity, source layer visibility, and base map style.
- Export validated GeoJSON.

## Agent Tools

Agent tools should be thin wrappers around the same project state used by the UI:

| Tool                            | Purpose                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `get_project_context`           | Return asset metadata, control points, bounds, existing features               |
| `get_rendered_map_view`         | Return PDF + map viewport PNGs **and** bounds/canvas metadata (see design doc) |
| `pdf_pixel_to_lon_lat`          | Convert traced PDF pixels to WGS84 using stored georeference                   |
| `lon_lat_to_pdf_pixel`          | Inverse transform for map-side reference work                                  |
| `propose_features_from_overlay` | Draft GeoJSON features from overlay and labels (prefer pdf-pixels output)      |
| `validate_geojson_features`     | Check geometry validity, properties, duplicates, and suspicious segments       |
| `apply_feature_patch`           | Add/update/delete draft features through a typed patch format                  |
| `explain_feature`               | Explain why a proposed feature exists and what visual evidence supports it     |

Expose these first through server functions/oRPC. MCP can wrap the same operations once auth and project permissions are solid.

**Vision vs coordinates:** agents get location from JSON context + transform tools, not from screenshots alone. Images are for tracing and QA; lat/lng come from control points, bounds metadata, and server-side conversion. See [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md).

## AI Chat Direction

If an in-app chat is useful, use TanStack AI with OpenRouter. The chat should be project-aware and tool-first: it should ask for viewport/context, propose feature patches, and explain uncertainty. It should not directly mutate final GeoJSON without creating a reviewable draft.

## Data Model Sketch

- `project`: owner, name, location hint, default CRS, created/updated timestamps.
- `source_asset`: project id, type, original file key, rendered page keys, dimensions.
- `control_point`: project id, asset id, image x/y, longitude, latitude, residual error.
- `geo_feature`: project id, GeoJSON geometry, properties JSON, source, status, confidence.
- `agent_run`: project id, model, prompt summary, input snapshot ids, output status.
- `feature_revision`: project id, feature id, patch, actor, created timestamp.

Do schema changes through Drizzle schema files and commands only. Do not hand-edit migrations.

## Cleanup Notes

Copied app and schema code now lives under `legacy/`, and both TypeScript and Vite+ checks ignore that archive. The active workspace is narrowed to `apps/web` and `packages/*`; future cleanup should delete or externalize the archive once the new GeoJSON data layer has enough of its own shape.
