import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sql } from "drizzle-orm";
import * as z from "zod/v4";
import { createMap, listMaps } from "@main/lib/pglite/maps.service.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { getRenderedMapView } from "@main/lib/workspace-snapshot/workspace-snapshot.service.js";
import { jsonToolResult, renderedMapViewMcpResult } from "./mcp-result-helpers.js";

export function registerMapTools(server: McpServer) {
  server.registerTool(
    "list_maps",
    {
      title: "List Maps",
      description: "List maps stored in the local PGlite database.",
      inputSchema: {},
    },
    async () => jsonToolResult({ maps: await listMaps() }),
  );

  server.registerTool(
    "create_map",
    {
      title: "Create Map",
      description: "Create a new map in the local PGlite database.",
      inputSchema: {
        name: z.string().optional().describe("Optional map name"),
      },
    },
    async (input) => {
      const map = await createMap(input);
      broadcastToRenderers("maps:changed", { reason: "created", mapId: map.id });
      return jsonToolResult({ map });
    },
  );

  server.registerTool(
    "db_ping",
    {
      title: "Database Ping",
      description: "Check that the local PGlite database is reachable.",
      inputSchema: {},
    },
    async () => {
      const db = getPgliteDb();
      const result = await db.execute(sql`select 1 as ok`);
      const row = result.rows[0] as { ok: number } | undefined;
      return jsonToolResult({ ok: row?.ok === 1 });
    },
  );

  server.registerTool(
    "get_rendered_map_view",
    {
      title: "Get Rendered Map View",
      description:
        "Capture or return the latest PDF and map pane PNG snapshots with viewport metadata. " +
        "Requires the map workspace to be open for live capture.",
      inputSchema: {
        mapId: z.number().int().positive(),
        liveCapture: z
          .boolean()
          .optional()
          .describe("When true (default), capture the current on-screen workspace."),
      },
    },
    async (input) =>
      renderedMapViewMcpResult(
        await getRenderedMapView(input.mapId, { liveCapture: input.liveCapture ?? true }),
      ),
  );
}
