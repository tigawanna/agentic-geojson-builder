import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { listControlPoints } from "@main/lib/pglite/control-points.service.js";
import { getMapTileCache } from "@main/lib/tile-cache/tile-cache.service.js";
import { requestSetMapViewport } from "@main/lib/workspace-snapshot/viewport-command.service.js";
import { getRenderedMapView } from "@main/lib/workspace-snapshot/workspace-snapshot.service.js";
import { computeTileCacheCoverage } from "@shared/tile-cache-coverage.js";
import { buildPlacementQualityHints } from "@shared/placement-quality-hints.js";
import { CONTROL_POINT_PLACEMENT_PROMPT_NAME } from "@shared/agent-control-point-placement-guide.js";
import { jsonToolResult, renderedMapViewMcpResult } from "./mcp-result-helpers.js";

const boundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

export function registerViewportTools(server: McpServer) {
  server.registerTool(
    "set_map_viewport",
    {
      title: "Set Map Viewport",
      description:
        "Pan and zoom the map pane before placing reference points (see place_reference_point prompt). " +
        "Use latitude/longitude/zoom or fitBounds. Requires the map workspace to be open.",
      inputSchema: {
        mapId: z.number().int().positive(),
        latitude: z.number().optional().describe("Center latitude for the viewport."),
        longitude: z.number().optional().describe("Center longitude for the viewport."),
        zoom: z.number().int().min(0).max(22).optional(),
        fitBounds: boundsSchema
          .optional()
          .describe("Fit the viewport to these geographic bounds instead of a center point."),
      },
    },
    async (input) => {
      const viewport = await requestSetMapViewport(input);
      return jsonToolResult({ viewport });
    },
  );

  server.registerTool(
    "get_rendered_map_view_with_coverage",
    {
      title: "Get Rendered Map View With Coverage",
      description:
        "Capture PDF + map PNGs with coordinate grids and tile cache coverage. " +
        `Use with ${CONTROL_POINT_PLACEMENT_PROMPT_NAME} workflow before placement.`,
      inputSchema: {
        mapId: z.number().int().positive(),
        liveCapture: z.boolean().optional(),
      },
    },
    async (input) => {
      const result = await getRenderedMapView(input.mapId, {
        liveCapture: input.liveCapture ?? true,
      });

      const tileCacheConfig = await getMapTileCache(input.mapId);
      const viewportBounds = result.snapshot?.mapPane?.viewport.bounds;

      const coverage = viewportBounds
        ? computeTileCacheCoverage(viewportBounds, tileCacheConfig)
        : computeTileCacheCoverage({ north: 0, south: 0, east: 0, west: 0 }, null);

      const controlPoints = await listControlPoints(input.mapId);
      const placementQuality = buildPlacementQualityHints(coverage, controlPoints);

      const base = renderedMapViewMcpResult(result);
      const enriched = {
        ...(base.structuredContent as Record<string, unknown>),
        tileCacheCoverage: coverage,
        placementQuality,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...JSON.parse((base.content[0] as { text: string }).text),
                tileCacheCoverage: coverage,
                placementQuality,
              },
              null,
              2,
            ),
          },
        ],
        structuredContent: enriched,
      };
    },
  );
}
