import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { sql } from "drizzle-orm";
import * as z from "zod/v4";
import { createMap, listMaps } from "../lib/pglite/maps.service.js";
import { getPgliteDb } from "../lib/pglite/client.js";
import { broadcastToRenderers } from "../ipc/broadcast.js";

function jsonToolResult<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function createDesktopMcpServer(): McpServer {
  const server = new McpServer({
    name: "agentic-geojson-desktop",
    version: "0.1.0",
  });

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
      return jsonToolResult(map);
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

  return server;
}
