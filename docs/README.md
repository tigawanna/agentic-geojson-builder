# Documentation

All docs describe the **same current reality**: server Postgres, `/maps` routes, no active PGLite in the web app.

| File                                                           | Read when you need…                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`map-workspace-features.md`](map-workspace-features.md)       | What the UI already does (reference points, PDF, Leaflet, etc.)       |
| [`agent-digitization-design.md`](agent-digitization-design.md) | How agents should work: chunking, coordinates, verification tools     |
| [`../TODOS.md`](../TODOS.md)                                   | What's done vs next phases; full tool inventory with UI/Agent columns |
| [`../GAMEPLAN.md`](../GAMEPLAN.md)                             | Product workflow mapped to implementation status                      |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md)                     | Stack, data layer diagram, key paths                                  |
| [`../VISION.md`](../VISION.md)                                 | Why we're building this                                               |

## Conventions

- **Routes:** `/maps`, `/maps/new`, `/maps/$id` — not `/map-projects`
- **Database:** PostgreSQL (`map`, `control_point`) — not browser PGLite
- **UI server fns:** exist in `data-access-layer/maps/` and `control-points/`
- **Agent/MCP tools:** planned in `features/agentic-tools/` — not registered yet
- **Tool names in design docs:** snake_case = agent/MCP contract; camelCase `*Fn` = UI server function today

When updating code, update the relevant doc in the same PR/session so these stay aligned.
