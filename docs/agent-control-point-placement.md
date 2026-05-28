# Agent reference point placement (desktop MCP)

Guide for agents placing **PDF ↔ map control points** in `apps/desktop` via the local MCP server.

**Source of truth (embedded in MCP):** `apps/desktop/src/shared/agent-control-point-placement-guide.ts`

---

## How agents discover this guide

| Surface          | Name                                                | Purpose                                                   |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------- |
| **Cursor skill** | `.cursor/skills/desktop-reference-point-placement/` | Project skill (SKILL.md + accuracy backlog)               |
| **MCP prompt**   | `place_reference_point`                             | Full workflow injected as a user message                  |
| **MCP tool**     | `get_reference_point_placement_guide`               | Same content as JSON `{ guide, promptName, resourceUri }` |
| **MCP resource** | `guide://agentic-geojson/control-point-placement`   | Markdown resource for clients that read resources         |

Tool descriptions on `create_control_point_from_viewport_pixels` and `create_control_point` point agents to the prompt.

`get_rendered_map_view_with_coverage` also returns `placementQuality` with `warnings` and `suggestions` (coverage, point count, spread).

---

## Quick workflow

1. Open the map workspace in the desktop app.
2. `set_map_viewport` — frame the trail area (use tile cache bounds).
3. `get_rendered_map_view_with_coverage` — capture PDF + map; confirm `overlapPercent` ≥ 99%.
4. Pick the **same landmark** on both images (gate, trail junction, River Cafe, Mau-Mau Caves, etc.).
5. `create_control_point_from_viewport_pixels` with `mapPaneX/Y`, `pdfPaneX/Y`, and a clear `label`.
6. `list_control_points` — verify; leave points for human review unless asked to delete.

---

## Snapshot overlays

Captures include agent aids (not shown in the normal UI):

- **PDF:** 100 px grid, axis labels, canvas dimensions.
- **Map:** Lat/lon ticks, viewport bounds header (N/S/E/W).

Use these grids to read pixel positions before placing.

---

## Related docs

- [`desktop-app-handoff.md`](desktop-app-handoff.md) — IPC, MCP URL, workspace layout
- [`agent-tile-cache-handoff.md`](agent-tile-cache-handoff.md) — Tile cache bounds and coverage
- [`agent-digitization-design.md`](agent-digitization-design.md) — Why control points matter for georef and tracing

---

## Cursor MCP config

```json
{
  "mcpServers": {
    "agentic-geojson-desktop": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

After code changes, restart the desktop app so MCP picks up new prompts/tools.
