import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { listMarkerNeighbors } from "@main/lib/pglite/marker-neighbors.service.js";
import { listMapPoints } from "@main/lib/pglite/map-points.service.js";
import {
  auditNeighborGraph,
  formatNeighborGraphAuditReport,
  findMapPointByRef,
} from "@shared/neighbor-graph-audit.js";
import { analyzeNeighborRouteLegs } from "@shared/neighbor-graph.js";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref.js";
import { jsonToolResult, textToolResult } from "./mcp-result-helpers.js";
import { runLoggedMcpTool } from "./log-mcp-tool.js";

export function registerMarkerNeighborTools(server: McpServer) {
  server.registerTool(
    "audit_neighbor_graph",
    {
      title: "Audit Neighbor Graph",
      description:
        "Analyze marker neighbor links for a map: isolated markers, dead ends, long jumps, disconnected components, and optional path trace between two refs.",
      inputSchema: {
        mapId: z.number().int().positive(),
        longJumpThresholdMeters: z.number().positive().optional(),
        fromRef: z.string().trim().min(1).optional(),
        toRef: z.string().trim().min(1).optional(),
        format: z.enum(["json", "text"]).optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("audit_neighbor_graph", input, async () => {
        const [mapPoints, neighbors] = await Promise.all([
          listMapPoints(input.mapId),
          listMarkerNeighbors(input.mapId),
        ]);
        const result = auditNeighborGraph({
          mapId: input.mapId,
          mapPoints,
          neighbors,
          longJumpThresholdMeters: input.longJumpThresholdMeters,
          fromRef: input.fromRef,
          toRef: input.toRef,
        });
        if (input.format === "text") {
          return textToolResult(formatNeighborGraphAuditReport(result));
        }
        return jsonToolResult(result as unknown as Record<string, unknown>);
      }),
  );

  server.registerTool(
    "trace_neighbor_path",
    {
      title: "Trace Neighbor Path",
      description:
        "Find the shortest neighbor-link path between two marker refs. Returns hop list and broken leg if unreachable.",
      inputSchema: {
        mapId: z.number().int().positive(),
        fromRef: z.string().trim().min(1),
        toRef: z.string().trim().min(1),
        viaRefs: z.array(z.string().trim().min(1)).optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("trace_neighbor_path", input, async () => {
        const [mapPoints, neighbors] = await Promise.all([
          listMapPoints(input.mapId),
          listMarkerNeighbors(input.mapId),
        ]);
        const fromPoint = findMapPointByRef(mapPoints, input.fromRef);
        const toPoint = findMapPointByRef(mapPoints, input.toRef);
        if (!fromPoint) {
          return textToolResult(`Unknown fromRef: ${input.fromRef}`);
        }
        if (!toPoint) {
          return textToolResult(`Unknown toRef: ${input.toRef}`);
        }

        const viaPointIds: number[] = [];
        for (const viaRef of input.viaRefs ?? []) {
          const viaPoint = findMapPointByRef(mapPoints, viaRef);
          if (!viaPoint) {
            return textToolResult(`Unknown viaRef: ${viaRef}`);
          }
          viaPointIds.push(viaPoint.id);
        }

        const analysis = analyzeNeighborRouteLegs({
          mapPoints,
          neighbors,
          fromPointId: fromPoint.id,
          toPointId: toPoint.id,
          viaPointIds,
        });
        const pointsById = new Map(mapPoints.map((point) => [point.id, point]));

        return jsonToolResult({
          fromRef: resolveMapPointLinkRef(fromPoint),
          toRef: resolveMapPointLinkRef(toPoint),
          found: analysis.merged.found,
          pointRefs: analysis.merged.pointIds
            .map((pointId) => pointsById.get(pointId))
            .filter((entry) => entry !== undefined)
            .map((entry) => resolveMapPointLinkRef(entry)),
          distanceMeters: analysis.merged.totalDistanceMeters,
          legs: analysis.legs.map((leg) => {
            const fromPoint = pointsById.get(leg.fromPointId);
            const toPoint = pointsById.get(leg.toPointId);
            return {
              fromRef: fromPoint ? resolveMapPointLinkRef(fromPoint) : String(leg.fromPointId),
              toRef: toPoint ? resolveMapPointLinkRef(toPoint) : String(leg.toPointId),
              found: leg.found,
              hopCount: Math.max(0, leg.pointIds.length - 1),
              pointRefs: leg.pointIds
                .map((pointId) => pointsById.get(pointId))
                .filter((entry) => entry !== undefined)
                .map((entry) => resolveMapPointLinkRef(entry)),
            };
          }),
        });
      }),
  );
}
