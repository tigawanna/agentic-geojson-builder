import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  buildMapTileCache,
  getMapSectorView,
  getMapTileCache,
  setMapTileCacheBoundsFromCorners,
} from "@main/lib/tile-cache/tile-cache.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { jsonToolResult, mapSectorToolResult } from "./mcp-result-helpers.js";

const cornerSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export function registerTileCacheTools(server: McpServer) {
  server.registerTool(
    "get_tile_cache_status",
    {
      title: "Get Tile Cache Status",
      description: "Return configured tile cache bounds and build status for a map.",
      inputSchema: { mapId: z.number().int().positive() },
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
    async (input) => jsonToolResult({ cache: await setMapTileCacheBoundsFromCorners(input) }),
  );

  server.registerTool(
    "build_tile_cache",
    {
      title: "Build Tile Cache",
      description: "Download and cache map tiles locally for offline use.",
      inputSchema: { mapId: z.number().int().positive() },
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
    async (input) => mapSectorToolResult(await getMapSectorView(input)),
  );
}
