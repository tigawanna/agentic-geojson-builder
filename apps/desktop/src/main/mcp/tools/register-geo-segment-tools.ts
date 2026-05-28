import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  applyFeaturePatch,
  exportGeoJson,
  findFeatureGapsForMap,
  listGeoSegments,
  mergeFeatureSegmentsForMap,
  updateGeoSegmentStatus,
} from "@main/lib/pglite/geo-segments.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { jsonToolResult } from "./mcp-result-helpers.js";

const lineStringGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

const pathKindSchema = z.enum([
  "bike-path",
  "dog-path",
  "walking-trail",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
]);

const segmentStatusSchema = z.enum(["draft", "needs-review", "accepted", "rejected"]);

function notifyGeoSegmentsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted" | "status-updated",
  segmentId?: number,
) {
  broadcastToRenderers("geoSegments:changed", { mapId, reason, segmentId });
}

export function registerGeoSegmentTools(server: McpServer) {
  server.registerTool(
    "list_feature_segments",
    {
      title: "List Feature Segments",
      description: "List traced trail/path segments for a map.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) => jsonToolResult({ segments: await listGeoSegments(input.mapId) }),
  );

  server.registerTool(
    "apply_feature_patch",
    {
      title: "Apply Feature Patch",
      description:
        "Create, update, or delete a trail segment. Agents should pass geometry in pdf-pixels unless coordinates are already WGS84.",
      inputSchema: {
        mapId: z.number().int().positive(),
        op: z.enum(["upsert_segment", "delete_segment"]),
        segmentGroupId: z.string().trim().min(1).max(128),
        segmentIndex: z.number().int().min(0).optional(),
        segmentId: z.number().int().positive().optional(),
        name: z.string().optional(),
        pathKind: pathKindSchema.optional(),
        status: segmentStatusSchema.optional(),
        coordinateSpace: z.enum(["wgs84", "pdf-pixels"]).optional(),
        geometry: lineStringGeometrySchema.optional(),
        confidence: z.number().min(0).max(1).optional(),
      },
    },
    async (input) => {
      const result = await applyFeaturePatch(input);
      if ("deleted" in result) {
        notifyGeoSegmentsChanged(input.mapId, "deleted", result.segmentId);
      } else {
        notifyGeoSegmentsChanged(
          input.mapId,
          input.segmentId ? "updated" : "created",
          result.segment.id,
        );
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    "find_feature_gaps",
    {
      title: "Find Feature Gaps",
      description: "Find unconnected endpoints between segments in the same trail group.",
      inputSchema: {
        mapId: z.number().int().positive(),
        segmentGroupId: z.string().trim().min(1).max(128).optional(),
        snapToleranceMeters: z.number().positive().optional(),
        statuses: z.array(segmentStatusSchema).optional(),
      },
    },
    async (input) => jsonToolResult(await findFeatureGapsForMap(input)),
  );

  server.registerTool(
    "merge_feature_segments",
    {
      title: "Merge Feature Segments",
      description: "Preview merging segments by trail group without persisting.",
      inputSchema: {
        mapId: z.number().int().positive(),
        segmentGroupId: z.string().trim().min(1).max(128).optional(),
        snapToleranceMeters: z.number().positive().optional(),
        statuses: z.array(segmentStatusSchema).optional(),
      },
    },
    async (input) => jsonToolResult(await mergeFeatureSegmentsForMap(input)),
  );

  server.registerTool(
    "update_feature_segment_status",
    {
      title: "Update Feature Segment Status",
      description: "Accept, reject, or mark a segment for review.",
      inputSchema: {
        mapId: z.number().int().positive(),
        segmentId: z.number().int().positive(),
        status: segmentStatusSchema,
      },
    },
    async (input) => {
      const segment = await updateGeoSegmentStatus(input);
      notifyGeoSegmentsChanged(input.mapId, "status-updated", segment.id);
      return jsonToolResult({ segment });
    },
  );

  server.registerTool(
    "export_geojson",
    {
      title: "Export GeoJSON",
      description: "Export traced trail segments as a GeoJSON FeatureCollection.",
      inputSchema: {
        mapId: z.number().int().positive(),
        segmentGroupId: z.string().trim().min(1).max(128).optional(),
        statuses: z.array(segmentStatusSchema).optional(),
        mergeGroups: z.boolean().optional(),
        snapToleranceMeters: z.number().positive().optional(),
      },
    },
    async (input) => jsonToolResult(await exportGeoJson(input)),
  );
}
