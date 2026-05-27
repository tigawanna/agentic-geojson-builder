# Desktop app — PGlite, IPC, MCP & map workspace handoff

Handoff for **`apps/desktop`**: local-first Electron shell with PGlite in the main process, typed IPC, an embedded MCP server, and the first map project / alignment workspace UI.

**Status:** Bootstrapped and working end-to-end for create → filesystem → split workspace. Control points, screenshots for agents, and full web parity are **not** done yet.

**Related:** [`map-workspace-features.md`](map-workspace-features.md) (web UI reference) · [`agent-digitization-design.md`](agent-digitization-design.md) · [`apps/desktop/docs/02-architecture.md`](../apps/desktop/docs/02-architecture.md) · [`apps/desktop/docs/03-ipc.md`](../apps/desktop/docs/03-ipc.md)

---

## What works today

| Capability           | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| **PGlite (main)**    | PostGIS-enabled DB under `userData/pglite`; Drizzle migrations on boot     |
| **Maps IPC**         | List, create, create project, get workspace, read source file              |
| **Push events**      | `maps:changed` → renderer invalidates TanStack Query caches                |
| **MCP server**       | Stateless HTTP on `http://127.0.0.1:3847/mcp` (toggle in Settings)         |
| **Map project flow** | Upload PDF/image + metadata → folder on disk → resizable PDF/map workspace |
| **Demo IPC UI**      | Home page “Maps IPC demo” (legacy learning widget; can be removed later)   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Renderer (React + TanStack Router + Query + Zustand)           │
│  /maps/new  →  CreateMapProjectForm                             │
│  /maps/$id  →  MapWorkspaceProvider + resizable split view      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ window.api.invoke / window.api.on
┌───────────────────────────▼─────────────────────────────────────┐
│  Preload — typed bridge (src/preload/index.ts)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ipcMain.handle / webContents.send
┌───────────────────────────▼─────────────────────────────────────┐
│  Main process                                                     │
│  ipc/maps.ts  →  maps.service.ts  →  PGlite (Drizzle)           │
│                 map-files.service.ts  →  userData/maps/{id}/      │
│  mcp/http-server.ts  →  create-desktop-mcp-server.ts (tools)    │
└─────────────────────────────────────────────────────────────────┘
```

**Design choices**

- **PGlite runs only in main** — renderer never touches the DB directly.
- **Map assets on disk** — PDF/image stored in `userData/maps/{id}/`; DB holds `folder_path` + metadata (not bytea for new projects).
- **IPC contract is the single source of truth** — `src/shared/ipc-contract.ts`.
- **Zustand + provider** — global store for create flow; scoped `MapWorkspaceProvider` per workspace route.
- **Files kept ≤ ~200 lines** — split by layer (hooks, components, services).

---

## Disk layout (map assets)

Base: `{electron userData}/maps/` (Linux: `~/.config/desktop/maps/`).

```
maps/
  {mapId}/
    {sanitized-filename}.pdf   # or .png / .jpg / .webp
    screenshots/               # created empty; reserved for agent captures
```

DB column `map.folder_path` points at the **map directory** (not the file path).

PGlite data: `{userData}/pglite/`.

---

## Key paths

| Area               | Path                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| Main entry         | `apps/desktop/src/main/index.ts`                                                   |
| PGlite client      | `apps/desktop/src/main/lib/pglite/client.ts`                                       |
| Map DB service     | `apps/desktop/src/main/lib/pglite/maps.service.ts`                                 |
| Filesystem service | `apps/desktop/src/main/lib/pglite/map-files.service.ts`                            |
| Map schema         | `apps/desktop/src/main/lib/pglite/schema/map.schema.ts`                            |
| Migrations         | `apps/desktop/drizzle-pglite/migrations/`                                          |
| IPC contract       | `apps/desktop/src/shared/ipc-contract.ts`                                          |
| IPC handlers       | `apps/desktop/src/main/ipc/maps.ts`                                                |
| MCP HTTP           | `apps/desktop/src/main/mcp/http-server.ts`                                         |
| MCP tools          | `apps/desktop/src/main/mcp/create-desktop-mcp-server.ts`                           |
| Shared map types   | `apps/desktop/src/shared/maps.types.ts`                                            |
| Zustand store      | `apps/desktop/src/renderer/src/features/maps/store/`                               |
| Create form        | `apps/desktop/src/renderer/src/features/maps/components/CreateMapProjectForm.tsx`  |
| Workspace split    | `apps/desktop/src/renderer/src/features/maps/components/MapWorkspaceSplitView.tsx` |
| Leaflet helpers    | `apps/desktop/src/renderer/src/features/maps/lib/map-handle.ts`                    |
| Routes             | `apps/desktop/src/renderer/src/routes/maps/`                                       |

---

## IPC channels (maps)

| Channel              | Direction             | Purpose                                          |
| -------------------- | --------------------- | ------------------------------------------------ |
| `maps:list`          | invoke                | Paginated-style list (`MapListItem[]`)           |
| `maps:create`        | invoke                | Simple name-only create (demo / MCP)             |
| `maps:createProject` | invoke                | Full project: metadata + base64 file → DB + disk |
| `maps:getWorkspace`  | invoke                | `MapWorkspaceState` for workspace route          |
| `maps:readSource`    | invoke                | Base64 + mime for PDF/image preview              |
| `maps:changed`       | event (main→renderer) | `{ reason, mapId? }` — invalidates queries       |

Example renderer usage:

```typescript
const workspace = await window.api.invoke("maps:getWorkspace", { mapId: 1 });
window.api.on("maps:changed", () => queryClient.invalidateQueries({ queryKey: ["maps"] }));
```

---

## MCP server

- **URL:** `http://127.0.0.1:3847/mcp` (default port; Settings → Local MCP server)
- **Mode:** Stateless streamable HTTP (`enableJsonResponse: true`) — compatible with Cursor
- **Auth:** None (localhost only; bind `127.0.0.1`)
- **Tools today:** `list_maps`, `create_map`, `db_ping`

Cursor `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agentic-geojson-desktop": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

**Note:** If port 3847 is held by a stale Electron process, new instances fail to bind — kill the old process or toggle MCP off/on in Settings.

---

## User flow

1. Sidebar → **Maps** → **New map project** (`#/maps/new`)
2. Upload PDF or image; enter name, optional description, location keywords, optional lat/lng
3. Submit → main creates DB row, writes file under `maps/{id}/`, navigates to `#/maps/{id}`
4. Workspace: resizable split — source document (pdf.js or `<img>`) + Leaflet map
5. If location keywords provided, map pans via Nominatim on load

Full-width layout applies automatically for `#/maps/{id}` routes (see `DashboardLayout.tsx` pathname check).

---

## Dependencies added (desktop)

| Package                          | Use                           |
| -------------------------------- | ----------------------------- |
| `@electric-sql/pglite` + postgis | Local DB                      |
| `drizzle-orm` / `drizzle-kit`    | Schema + migrations           |
| `@modelcontextprotocol/sdk`      | MCP HTTP server               |
| `zustand`                        | Workspace / create flow state |
| `leaflet`                        | Base map pane                 |
| `pdfjs-dist`                     | PDF preview                   |
| `react-resizable-panels`         | Draggable split               |

---

## Dev commands

```bash
# From repo root
pnpm dev                    # includes desktop via Turbo

# Desktop only
cd apps/desktop && pnpm dev

pnpm --filter desktop run build
pnpm --filter desktop run check-types
vp check                    # monorepo lint/format/types
```

---

## Schema notes

Migration `0005_map_project_fields.sql` adds:

- `description` — optional text
- `folder_path` — absolute path to map asset directory

Existing columns from web/legacy parity: `location_query`, viewport fields, PDF transform fields, `pdf_file_name`, legacy `pdf_data` bytea (unused by new file-based flow).

`control_point` table exists in PGlite; **no IPC or UI yet**.

---

## Renderer state pattern

```
map-workspace-store.ts     createStore() factory + default global instance
MapWorkspaceProvider.tsx   Scoped store per /maps/$id route
useHydrateMapWorkspace.ts  TanStack Query → hydrate store from IPC
useCreateMapProjectMutation.ts  File → base64 → maps:createProject → navigate
```

---

## Known gaps / next steps

| Item                  | Notes                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| Control points        | Schema exists; port pick modes + IPC from web `MapAlignmentWorkspace` |
| Workspace persistence | Debounced save of viewport, PDF pan/zoom, base map style              |
| Agent screenshots     | Write PNGs to `maps/{id}/screenshots/`; MCP tool to read path         |
| MCP tool parity       | Port tools from `apps/web/.../geojson-mcp.server.ts`                  |
| Maps list polish      | Remove or relocate Home IPC demo; richer list cards                   |
| `maps:delete`         | IPC + filesystem cleanup                                              |
| Packaged builds       | Verify `drizzle-pglite/migrations` extraResources + PGlite asarUnpack |
| Tests                 | E2E for create → workspace; IPC unit tests for services               |

**Web reference for alignment workspace:** `apps/web/src/routes/_dashboard/maps/new/-components/MapAlignmentWorkspace.tsx` (~2600 lines — port in slices, keep files ≤200 lines).

---

## Troubleshooting

| Symptom                                 | Likely cause                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| MCP `list_maps` structuredContent error | Stale server on :3847 with old code — restart app                                |
| MCP “No valid session ID”               | Fixed: server is stateless; restart if Cursor cached old session                 |
| Migrations fail on boot                 | Migrations must live in `drizzle-pglite/migrations/` (with `meta/_journal.json`) |
| Map preview empty                       | Check `maps:readSource` + file exists under `folder_path`                        |
| Port 3847 in use                        | `fuser -k 3847/tcp` or disable MCP in Settings                                   |

---

## Legacy reference

Browser PGlite example (IndexedDB): `legacy/apps-web-pglite-vite-example/`

Desktop intentionally uses **main-process PGlite + filesystem assets** instead of browser IndexedDB + bytea.
