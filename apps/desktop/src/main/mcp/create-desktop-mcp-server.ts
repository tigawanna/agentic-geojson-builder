import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { sql } from "drizzle-orm";
import * as z from "zod/v4";
import { createMap, listMaps } from "../lib/pglite/maps.service.js";
import { getPgliteDb } from "../lib/pglite/client.js";
import {
  buildMapTileCache,
  getMapSectorView,
  getMapTileCache,
  setMapTileCacheBoundsFromCorners,
} from "../lib/tile-cache/tile-cache.service.js";
import { broadcastToRenderers } from "../ipc/broadcast.js";

function jsonToolResult<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

const cornerSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

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

  server.registerTool(
    "get_tile_cache_status",
    {
      title: "Get Tile Cache Status",
      description: "Return configured tile cache bounds and build status for a map.",
      inputSchema: {
        mapId: z.number().int().positive(),
      },
    },
    async (input) => jsonToolResult({ cache: await getMapTileCache(input.mapId) }),
  );

  server.registerTool(
    "set_tile_cache_bounds",
    {
      title: "Set Tile Cache Bounds",
      description: "Configure tile cache bounds from four corner coordinates.",
      inputSchema: {
        mapId: z.number().int().positive(),
        corners: z.array(cornerSchema).length(4),
        style: z.enum(["outline", "standard", "satellite"]).optional(),
        minZoom: z.number().int().min(0).max(22).optional(),
        maxZoom: z.number().int().min(0).max(22).optional(),
      },
    },
    async (input) => jsonToolResult(await setMapTileCacheBoundsFromCorners(input)),
  );

  server.registerTool(
    "build_tile_cache",
    {
      title: "Build Tile Cache",
      description: "Download and cache map tiles locally for offline use.",
      inputSchema: {
        mapId: z.number().int().positive(),
      },
    },
    async (input) =>
      jsonToolResult(
        await buildMapTileCache(input.mapId, (progress) => {
          broadcastToRenderers("tileCache:buildProgress", progress);
        }),
      ),
  );

  server.registerTool(
    "get_map_sector_view",
    {
      title: "Get Map Sector View",
      description: "Return a stitched PNG map sector from the local tile cache.",
      inputSchema: {
        mapId: z.number().int().positive(),
        latitude: z.number(),
        longitude: z.number(),
        zoom: z.number().int().min(0).max(22).optional(),
        width: z.number().int().min(128).max(2048).optional(),
        height: z.number().int().min(128).max(2048).optional(),
        style: z.enum(["outline", "standard", "satellite"]).optional(),
      },
    },
    async (input) => jsonToolResult(await getMapSectorView(input)),
  );

  return server;
}
