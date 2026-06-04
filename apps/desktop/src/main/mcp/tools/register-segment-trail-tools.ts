import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  buildSegmentsFromPath,
  listSegmentEdges,
  previewBuildSegmentsFromPath,
} from "@main/lib/pglite/segment-edges.service.js";
import { findRoute, reachableFrom } from "@main/lib/pglite/routing.service.js";
import { listTrails } from "@main/lib/pglite/trails.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { jsonToolResult } from "./mcp-result-helpers.js";
import { runLoggedMcpTool } from "./log-mcp-tool.js";

function notifySegmentsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted" | "built",
  segmentId?: number,
) {
  broadcastToRenderers("segments:changed", { mapId, reason, segmentId });
  broadcastToRenderers("mapLinks:changed", { mapId, reason, segmentId });
}

export function registerSegmentTrailTools(server: McpServer) {
  server.registerTool(
    "list_path_segments",
    {
      title: "List Path Segments",
      description:
        "List marker-to-marker segment edges (topology) for a map. Distinct from traced geo_segment geometry.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) =>
      runLoggedMcpTool("list_path_segments", input, async () =>
        jsonToolResult({ segments: await listSegmentEdges(input.mapId) }),
      ),
  );

  server.registerTool(
    "preview_build_segments_from_path",
    {
      title: "Preview Build Segments From Path",
      description:
        "Preview segment edges that would be created by joining routing markers (junction/gate/node role) along a traced path slug.",
      inputSchema: {
        mapId: z.number().int().positive(),
        pathSlug: z.string().trim().min(1).max(128),
        maxProjectionDistanceMeters: z.number().positive().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("preview_build_segments_from_path", input, async () =>
        jsonToolResult(
          await previewBuildSegmentsFromPath({
            mapId: input.mapId,
            pathSlug: input.pathSlug,
            maxProjectionDistanceMeters: input.maxProjectionDistanceMeters,
          }),
        ),
      ),
  );

  server.registerTool(
    "build_segments_from_path",
    {
      title: "Build Segments From Path",
      description:
        "Create segment edges between routing markers along a traced path (segmentGroupId / pathSlug). " +
        "Markers need ref + junction/gate category or node_role junction/endpoint.",
      inputSchema: {
        mapId: z.number().int().positive(),
        pathSlug: z.string().trim().min(1).max(128),
        replaceExisting: z.boolean().optional(),
        maxProjectionDistanceMeters: z.number().positive().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("build_segments_from_path", input, async () => {
        const result = await buildSegmentsFromPath({
          mapId: input.mapId,
          pathSlug: input.pathSlug,
          replaceExisting: input.replaceExisting ?? true,
          maxProjectionDistanceMeters: input.maxProjectionDistanceMeters,
        });
        notifySegmentsChanged(input.mapId, "built");
        return jsonToolResult(result);
      }),
  );

  server.registerTool(
    "list_trails",
    {
      title: "List Trails",
      description: "List named trails composed of ordered segment edges for a map.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) =>
      runLoggedMcpTool("list_trails", input, async () =>
        jsonToolResult({ trails: await listTrails(input.mapId) }),
      ),
  );

  server.registerTool(
    "find_route",
    {
      title: "Find Route",
      description:
        "Find shortest path between two marker refs through segment edges. Optional viaRefs for intermediate stops.",
      inputSchema: {
        mapId: z.number().int().positive(),
        fromRef: z.string().trim().min(1).max(64),
        toRef: z.string().trim().min(1).max(64),
        viaRefs: z.array(z.string().trim().min(1).max(64)).optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("find_route", input, async () =>
        jsonToolResult(
          await findRoute({
            mapId: input.mapId,
            fromRef: input.fromRef,
            toRef: input.toRef,
            viaRefs: input.viaRefs,
          }),
        ),
      ),
  );

  server.registerTool(
    "reachable_from_marker",
    {
      title: "Reachable From Marker",
      description: "List marker refs and segment ids reachable from a starting ref.",
      inputSchema: {
        mapId: z.number().int().positive(),
        fromRef: z.string().trim().min(1).max(64),
      },
    },
    async (input) =>
      runLoggedMcpTool("reachable_from_marker", input, async () =>
        jsonToolResult(await reachableFrom({ mapId: input.mapId, fromRef: input.fromRef })),
      ),
  );
}
