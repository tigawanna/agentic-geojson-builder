# Documentation

All docs describe the **same current reality**: server Postgres, `/maps` routes, no active PGLite in the web app.

| File                                                                                                        | Read when you need…                                                        |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`map-workspace-features.md`](map-workspace-features.md)                                                    | What the UI already does (reference points, PDF, Leaflet, etc.)            |
| [`desktop-app-handoff.md`](desktop-app-handoff.md)                                                          | **Desktop app:** PGlite, IPC, MCP, map project flow, disk layout           |
| [`agent-tile-cache-handoff.md`](agent-tile-cache-handoff.md)                                                | Agent tile cache prototype: sectors, disk cache, MCP tools, georef         |
| [`agent-control-point-placement.md`](agent-control-point-placement.md)                                      | **Desktop MCP:** reference point placement prompt, workflow, overlays      |
| [`.cursor/skills/desktop-reference-point-placement/`](../.cursor/skills/desktop-reference-point-placement/) | **Cursor skill:** placement workflow + accuracy improvements backlog       |
| [`agent-digitization-design.md`](agent-digitization-design.md)                                              | How agents should work: chunking, coordinates, verification tools          |
| [`karura-trail-drawing-handoff.md`](karura-trail-drawing-handoff.md)                                        | **Karura next phase:** sparse trail drawing, GPX underlay, web Trace trail |
| [`../TODOS.md`](../TODOS.md)                                                                                | What's done vs next phases; full tool inventory with UI/Agent columns      |
| [`../GAMEPLAN.md`](../GAMEPLAN.md)                                                                          | Product workflow mapped to implementation status                           |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md)                                                                  | Stack, data layer diagram, key paths                                       |
| [`../VISION.md`](../VISION.md)                                                                              | Why we're building this                                                    |

## Conventions

- **Routes:** `/maps`, `/maps/new`, `/maps/$id` — not `/map-projects`
- **Database:** PostgreSQL (`map`, `control_point`) — not browser PGLite
- **UI server fns:** exist in `data-access-layer/maps/` and `control-points/`
- **Agent/MCP tools:** registered in `features/agentic-tools/` (maps, georef, segments, tile cache, rendered views)
- **Tool names in design docs:** snake_case = agent/MCP contract; camelCase `*Fn` = UI server function today

When updating code, update the relevant doc in the same PR/session so these stay aligned.
