# Agentic GeoJSON Builder - product vision

## Problem

Useful local maps often exist only as images or PDFs. The Karura Forest map is a good example: it contains meaningful labels for bike paths, dog paths, facilities, and route details, but it is static. To build better apps on top of it, those visual markings need to become georeferenced GeoJSON.

## Core idea

**The source map is a traceable overlay.** Upload an image or PDF, align it against a real base map, then create or review GeoJSON features directly on top of it. The app should support careful manual tracing and agent-assisted extraction from the same editing surface.

## Why agentic

The near-term workflow is manual but structured: georeference, draw, label, validate, export. The agentic layer should sit beside that workflow, not replace it. An agent can propose path geometries, classify line types, detect labels, or compare a PDF overlay with Leaflet or Google map tiles, but the human remains able to edit every geometry.

## Near-term priority

Ship the builder foundation: project records, asset upload, image/PDF preview, map overlay calibration, manual drawing tools, GeoJSON validation, and export. Agent and MCP tools should be designed around the same project state so automation and human edits converge on one source of truth.

## Non-goals (for now)

- Fully automatic extraction with no human review
- Owning base map data or replacing Leaflet/Google Maps
- Solving every GIS format before GeoJSON is excellent
