# Agentic GeoJSON Builder - product vision

## Problem

Useful local maps often exist only as images or PDFs. The Karura Forest map is a good example: it contains meaningful labels for bike paths, dog paths, facilities, and route details, but it is static. To build better apps on top of it, those visual markings need to become georeferenced GeoJSON.

## Core idea

**The source map is a traceable overlay.** Upload an image or PDF, align it against a real base map, then create or review GeoJSON features directly on top of it. The app should support careful manual tracing and agent-assisted extraction from the same editing surface.

## Why agentic

The near-term workflow is manual but structured: georeference, draw, label, validate, export. The agentic layer should sit beside that workflow, not replace it. An agent can propose path geometries, classify line types, detect labels, or compare a PDF overlay with Leaflet or Google map tiles, but the human remains able to edit every geometry.

## Near-term priority

1. **Done:** Map workspace on server Postgres — upload PDF, place control points, persist per user.
2. **Next:** Affine georeference from control points; agent/MCP tool layer on same server state.
3. **Then:** Segment-based tracing, agent vision loop, GeoJSON export.

All automation and human edits must converge on **one Postgres source of truth** (MCP-ready). See [`TODOS.md`](TODOS.md) and [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md).

## Non-goals (for now)

- Fully automatic extraction with no human review
- Owning base map data or replacing Leaflet/Google Maps
- Solving every GIS format before GeoJSON is excellent
- Browser-only database sync (PGLite removed from web; may return for Electron offline)
