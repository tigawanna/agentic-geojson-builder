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
import {
  createControlPoint,
  deleteControlPoint,
  listControlPoints,
  updateControlPoint,
} from "../lib/pglite/control-points.service.js";
import {
  convertMapPanePixel,
  convertPdfPanePixel,
  createControlPointFromViewportPixels,
} from "../lib/viewport-coordinates/viewport-coordinates.service.js";
import type { MapSectorViewResult } from "../../shared/tile-cache.types.js";
import type { GetRenderedMapViewResult } from "../../shared/rendered-map-view.types.js";
import {
  getRenderedMapView,
  renderedMapViewStructuredResult,
  renderedMapViewToolResult,
} from "../lib/workspace-snapshot/workspace-snapshot.service.js";

function jsonToolResult(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function mapSectorToolResult(data: MapSectorViewResult): CallToolResult {
  const { imageBase64, ...summary } = data;
  const structuredContent = {
    ...summary,
    hasImage: true,
    imageBase64Length: imageBase64.length,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent,
  };
}

function renderedMapViewMcpResult(data: GetRenderedMapViewResult): CallToolResult {
  const payload = renderedMapViewToolResult(data);
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: renderedMapViewStructuredResult(data),
  };
}

const cornerSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

function notifyControlPointsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted",
  controlPointId?: number,
) {
  broadcastToRenderers("controlPoints:changed", { mapId, reason, controlPointId });
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
    async (input) => jsonToolResult({ cache: await setMapTileCacheBoundsFromCorners(input) }),
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
    async (input) => mapSectorToolResult(await getMapSectorView(input)),
  );

  server.registerTool(
    "get_rendered_map_view",
    {
      title: "Get Rendered Map View",
      description:
        "Capture or return the latest PDF and map pane PNG snapshots with viewport metadata. Requires the map workspace to be open for live capture.",
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

  server.registerTool(
    "list_control_points",
    {
      title: "List Control Points",
      description: "List PDF-to-map reference points for a map.",
      inputSchema: {
        mapId: z.number().int().positive(),
      },
    },
    async (input) => jsonToolResult({ controlPoints: await listControlPoints(input.mapId) }),
  );

  server.registerTool(
    "create_control_point",
    {
      title: "Create Control Point",
      description: "Create a PDF-to-map reference point with explicit coordinates.",
      inputSchema: {
        mapId: z.number().int().positive(),
        imageX: z.number(),
        imageY: z.number(),
        longitude: z.number(),
        latitude: z.number(),
        label: z.string().optional(),
      },
    },
    async (input) => {
      const controlPoint = await createControlPoint(input);
      notifyControlPointsChanged(input.mapId, "created", controlPoint.id);
      return jsonToolResult({ controlPoint });
    },
  );

  server.registerTool(
    "update_control_point",
    {
      title: "Update Control Point",
      description: "Update a PDF-to-map reference point.",
      inputSchema: {
        mapId: z.number().int().positive(),
        controlPointId: z.number().int().positive(),
        imageX: z.number(),
        imageY: z.number(),
        longitude: z.number(),
        latitude: z.number(),
      },
    },
    async (input) => {
      const controlPoint = await updateControlPoint(input);
      notifyControlPointsChanged(input.mapId, "updated", controlPoint.id);
      return jsonToolResult({ controlPoint });
    },
  );

  server.registerTool(
    "delete_control_point",
    {
      title: "Delete Control Point",
      description: "Delete a PDF-to-map reference point.",
      inputSchema: {
        mapId: z.number().int().positive(),
        controlPointId: z.number().int().positive(),
      },
    },
    async (input) => {
      await deleteControlPoint(input);
      notifyControlPointsChanged(input.mapId, "deleted", input.controlPointId);
      return jsonToolResult({
        mapId: input.mapId,
        controlPointId: input.controlPointId,
        deleted: true,
      });
    },
  );

  server.registerTool(
    "map_pane_pixel_to_lon_lat",
    {
      title: "Map Pane Pixel To Lon Lat",
      description: "Convert a pixel position in the latest map pane snapshot to WGS84 coordinates.",
      inputSchema: {
        mapId: z.number().int().positive(),
        x: z.number(),
        y: z.number(),
        liveCapture: z.boolean().optional(),
      },
    },
    async (input) => jsonToolResult(await convertMapPanePixel(input)),
  );

  server.registerTool(
    "pdf_pane_pixel_to_image_xy",
    {
      title: "PDF Pane Pixel To Image XY",
      description:
        "Convert a pixel position in the latest PDF pane snapshot to source document image coordinates.",
      inputSchema: {
        mapId: z.number().int().positive(),
        x: z.number(),
        y: z.number(),
        liveCapture: z.boolean().optional(),
      },
    },
    async (input) => jsonToolResult(await convertPdfPanePixel(input)),
  );

  server.registerTool(
    "create_control_point_from_viewport_pixels",
    {
      title: "Create Control Point From Viewport Pixels",
      description:
        "Create a reference point from pixel positions in the latest PDF and map pane snapshots.",
      inputSchema: {
        mapId: z.number().int().positive(),
        mapPaneX: z.number(),
        mapPaneY: z.number(),
        pdfPaneX: z.number(),
        pdfPaneY: z.number(),
        label: z.string().optional(),
        liveCapture: z.boolean().optional(),
      },
    },
    async (input) => {
      const result = await createControlPointFromViewportPixels(input);
      notifyControlPointsChanged(input.mapId, "created", result.controlPoint.id);
      return jsonToolResult(result);
    },
  );

  return server;
}
