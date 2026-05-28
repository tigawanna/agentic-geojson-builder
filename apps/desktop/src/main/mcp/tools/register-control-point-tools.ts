import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  createControlPoint,
  deleteControlPoint,
  listControlPoints,
  updateControlPoint,
} from "@main/lib/pglite/control-points.service.js";
import {
  convertMapPanePixel,
  convertPdfPanePixel,
  createControlPointFromViewportPixels,
} from "@main/lib/viewport-coordinates/viewport-coordinates.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { CONTROL_POINT_PLACEMENT_PROMPT_NAME } from "@shared/agent-control-point-placement-guide.js";
import { jsonToolResult } from "./mcp-result-helpers.js";

const PLACEMENT_HINT = `Read MCP prompt "${CONTROL_POINT_PLACEMENT_PROMPT_NAME}" or call get_reference_point_placement_guide first. `;

function notifyControlPointsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted",
  controlPointId?: number,
) {
  broadcastToRenderers("controlPoints:changed", { mapId, reason, controlPointId });
}

export function registerControlPointTools(server: McpServer) {
  server.registerTool(
    "list_control_points",
    {
      title: "List Control Points",
      description: "List PDF-to-map reference points for a map.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) => jsonToolResult({ controlPoints: await listControlPoints(input.mapId) }),
  );

  server.registerTool(
    "create_control_point",
    {
      title: "Create Control Point",
      description:
        PLACEMENT_HINT +
        "Create a PDF-to-map reference point with explicit imageX/imageY and latitude/longitude.",
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
        PLACEMENT_HINT +
        "Preferred placement tool: pass matching pixel positions from the latest PDF and map pane snapshots. " +
        "Requires workspace open; capture with get_rendered_map_view_with_coverage first.",
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
}
