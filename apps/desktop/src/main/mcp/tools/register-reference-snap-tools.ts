import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  computeAllIntersections,
  type NamedLineString,
} from "@main/lib/geojson/intersection-solver.js";
import { snapToGuides, snapTraceCoordinates } from "@main/lib/geojson/snap-engine.js";
import { jsonToolResult } from "./mcp-result-helpers.js";
import { runLoggedMcpTool } from "./log-mcp-tool.js";

const referenceLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

export function registerReferenceSnapTools(server: McpServer) {
  server.registerTool(
    "compute_reference_intersections",
    {
      title: "Compute Reference Intersections",
      description:
        "Find all geometric intersection points between reference LineString trails. " +
        "Use these intersections as precise anchor points when starting or ending new trail traces. " +
        "Pass at least 2 lines; returns deduplicated crossing points with labels.",
      inputSchema: {
        lines: z.array(referenceLineSchema).min(2),
        deduplicateToleranceMeters: z
          .number()
          .positive()
          .optional()
          .describe("Merge intersections within this distance (default 5m)"),
      },
    },
    async (input) =>
      runLoggedMcpTool("compute_reference_intersections", input, async () => {
        const lines: NamedLineString[] = input.lines.map((l) => ({
          id: l.id,
          name: l.name,
          coordinates: l.coordinates,
        }));

        const intersections = computeAllIntersections(lines, {
          deduplicateToleranceMeters: input.deduplicateToleranceMeters,
        });

        return jsonToolResult({
          intersectionCount: intersections.length,
          intersections: intersections.map((p) => ({
            longitude: p.longitude,
            latitude: p.latitude,
            lineA: p.lineA,
            lineB: p.lineB,
            label: p.label,
          })),
        });
      }),
  );

  server.registerTool(
    "snap_to_reference",
    {
      title: "Snap Point to Reference",
      description:
        "Given a lat/lng coordinate and reference guide lines, find the nearest point on any guide " +
        "within the snap tolerance. Returns the snapped coordinate or indicates no snap was found. " +
        "Use this to align vertices to existing documented trails.",
      inputSchema: {
        latitude: z.number(),
        longitude: z.number(),
        guides: z.array(referenceLineSchema).min(1),
        toleranceMeters: z
          .number()
          .positive()
          .optional()
          .describe("Max snap distance in meters (default 20m)"),
      },
    },
    async (input) =>
      runLoggedMcpTool("snap_to_reference", input, async () => {
        const guides: NamedLineString[] = input.guides.map((g) => ({
          id: g.id,
          name: g.name,
          coordinates: g.coordinates,
        }));

        const result = snapToGuides(input.latitude, input.longitude, guides, input.toleranceMeters);

        if (result.snapped) {
          return jsonToolResult({
            snapped: true,
            original: { latitude: input.latitude, longitude: input.longitude },
            result: {
              latitude: result.target.latitude,
              longitude: result.target.longitude,
              distanceMeters: result.target.distanceMeters,
              snappedTo: result.target.snappedTo,
            },
          });
        }

        return jsonToolResult({
          snapped: false,
          original: { latitude: input.latitude, longitude: input.longitude },
          message: `No guide geometry within ${input.toleranceMeters ?? 20}m tolerance`,
        });
      }),
  );

  server.registerTool(
    "snap_trace_to_reference",
    {
      title: "Snap Trace to Reference",
      description:
        "Given a full polyline trace (array of [lng, lat] coordinates) and reference guide lines, " +
        "snap vertices that fall within tolerance to the nearest point on a guide. " +
        "Use endpointsOnly=true to only snap the first and last vertex (preserves free-form middle). " +
        "Returns the adjusted coordinates with a summary of which points were snapped.",
      inputSchema: {
        coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
        guides: z.array(referenceLineSchema).min(1),
        toleranceMeters: z
          .number()
          .positive()
          .optional()
          .describe("Max snap distance in meters (default 20m)"),
        endpointsOnly: z
          .boolean()
          .optional()
          .describe("Only snap first and last vertices (default false)"),
      },
    },
    async (input) =>
      runLoggedMcpTool("snap_trace_to_reference", input, async () => {
        const guides: NamedLineString[] = input.guides.map((g) => ({
          id: g.id,
          name: g.name,
          coordinates: g.coordinates,
        }));

        const result = snapTraceCoordinates(input.coordinates, guides, {
          snapToleranceMeters: input.toleranceMeters,
          endpointsOnly: input.endpointsOnly,
        });

        return jsonToolResult({
          snapToleranceMeters: result.snapToleranceMeters,
          totalVertices: input.coordinates.length,
          snappedCount: result.snappedCount,
          coordinates: result.coordinates,
          snapDetails: result.snapDetails.map((d) => ({
            coordinateIndex: d.coordinateIndex,
            longitude: d.target.longitude,
            latitude: d.target.latitude,
            distanceMeters: d.target.distanceMeters,
            snappedTo: d.target.snappedTo,
          })),
        });
      }),
  );
}
