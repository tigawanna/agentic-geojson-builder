import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { buildBundle } from "@main/lib/pglite/map-bundle.service.js";
import {
  createMapLink,
  createMapLinkFromPoints,
  deleteMapLink,
  listMapLinks,
} from "@main/lib/pglite/map-links.service.js";
import {
  createMapPoint,
  deleteMapPoint,
  listMapPoints,
  updateMapPoint,
} from "@main/lib/pglite/map-points.service.js";
import { jsonToolResult } from "./mcp-result-helpers.js";
import { runLoggedMcpTool } from "./log-mcp-tool.js";

const categorySchema = z.enum([
  "junction",
  "gate",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "custom",
]);

const elevationSourceSchema = z.enum(["manual", "inferred_from_path"]);

export function registerMapPointTools(server: McpServer) {
  server.registerTool(
    "list_map_points",
    {
      title: "List Map Points",
      description: "List labeled markers (points) for a map.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) =>
      runLoggedMcpTool("list_map_points", input, async () =>
        jsonToolResult({ points: await listMapPoints(input.mapId) }),
      ),
  );

  server.registerTool(
    "create_map_point",
    {
      title: "Create Map Point",
      description:
        "Create a labeled marker. Coordinates are WGS84 [longitude, latitude]. " +
        "Decision nodes (junction, gate) must have a stable, unique ref.",
      inputSchema: {
        mapId: z.number().int().positive(),
        longitude: z.number(),
        latitude: z.number(),
        ref: z.string().trim().max(64).optional(),
        name: z.string().max(255).optional(),
        category: categorySchema.optional(),
        elevation: z.number().optional(),
        elevationSource: elevationSourceSchema.optional(),
        description: z.string().optional(),
        parentRef: z.string().trim().max(64).optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("create_map_point", input, async () => {
        const point = await createMapPoint(input);
        broadcastToRenderers("mapPoints:changed", {
          mapId: input.mapId,
          reason: "created",
          pointId: point.id,
        });
        return jsonToolResult({ point });
      }),
  );

  server.registerTool(
    "update_map_point",
    {
      title: "Update Map Point",
      description: "Update a marker's ref, name, category, elevation, coordinates, or description.",
      inputSchema: {
        mapId: z.number().int().positive(),
        pointId: z.number().int().positive(),
        longitude: z.number().optional(),
        latitude: z.number().optional(),
        ref: z.string().trim().max(64).nullable().optional(),
        name: z.string().max(255).nullable().optional(),
        category: categorySchema.optional(),
        elevation: z.number().nullable().optional(),
        elevationSource: elevationSourceSchema.nullable().optional(),
        description: z.string().nullable().optional(),
        parentRef: z.string().trim().max(64).nullable().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("update_map_point", input, async () => {
        const point = await updateMapPoint(input);
        broadcastToRenderers("mapPoints:changed", {
          mapId: input.mapId,
          reason: "updated",
          pointId: point.id,
        });
        return jsonToolResult({ point });
      }),
  );

  server.registerTool(
    "delete_map_point",
    {
      title: "Delete Map Point",
      description: "Delete a marker by id.",
      inputSchema: {
        mapId: z.number().int().positive(),
        pointId: z.number().int().positive(),
      },
    },
    async (input) =>
      runLoggedMcpTool("delete_map_point", input, async () => {
        await deleteMapPoint(input);
        broadcastToRenderers("mapPoints:changed", {
          mapId: input.mapId,
          reason: "deleted",
          pointId: input.pointId,
        });
        return jsonToolResult({ ok: true });
      }),
  );

  server.registerTool(
    "list_map_links",
    {
      title: "List Map Links",
      description: "List edges between points along a path for a map.",
      inputSchema: { mapId: z.number().int().positive() },
    },
    async (input) =>
      runLoggedMcpTool("list_map_links", input, async () =>
        jsonToolResult({ links: await listMapLinks(input.mapId) }),
      ),
  );

  server.registerTool(
    "create_map_link",
    {
      title: "Create Map Link",
      description:
        "Create an edge between two point refs along a single pathSlug. " +
        "Provide startFraction/endFraction (0–1 along the path) when known.",
      inputSchema: {
        mapId: z.number().int().positive(),
        fromRef: z.string().trim().min(1).max(64),
        toRef: z.string().trim().min(1).max(64),
        pathSlug: z.string().trim().min(1).max(128),
        startFraction: z.number().min(0).max(1).optional(),
        endFraction: z.number().min(0).max(1).optional(),
        bidirectional: z.boolean().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("create_map_link", input, async () => {
        const link = await createMapLink(input);
        broadcastToRenderers("mapLinks:changed", {
          mapId: input.mapId,
          reason: "created",
          linkId: link.id,
        });
        return jsonToolResult({ link });
      }),
  );

  server.registerTool(
    "create_map_link_from_points",
    {
      title: "Create Map Link From Points",
      description:
        "Create a link between two existing points (by id). The desktop projects both points " +
        "onto the nearest path and computes startFraction/endFraction automatically.",
      inputSchema: {
        mapId: z.number().int().positive(),
        fromPointId: z.number().int().positive(),
        toPointId: z.number().int().positive(),
        pathSlug: z.string().trim().min(1).max(128).optional(),
        bidirectional: z.boolean().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("create_map_link_from_points", input, async () => {
        const link = await createMapLinkFromPoints(input);
        broadcastToRenderers("mapLinks:changed", {
          mapId: input.mapId,
          reason: "created",
          linkId: link.id,
        });
        return jsonToolResult({ link });
      }),
  );

  server.registerTool(
    "delete_map_link",
    {
      title: "Delete Map Link",
      description: "Delete a link by id.",
      inputSchema: {
        mapId: z.number().int().positive(),
        linkId: z.number().int().positive(),
      },
    },
    async (input) =>
      runLoggedMcpTool("delete_map_link", input, async () => {
        await deleteMapLink(input);
        broadcastToRenderers("mapLinks:changed", {
          mapId: input.mapId,
          reason: "deleted",
          linkId: input.linkId,
        });
        return jsonToolResult({ ok: true });
      }),
  );

  server.registerTool(
    "build_export_bundle",
    {
      title: "Build Export Bundle",
      description:
        "Assemble the versioned routing bundle (paths, points, links) plus a validation report. " +
        "Use this to inspect what would be exported to the mobile app.",
      inputSchema: {
        mapId: z.number().int().positive(),
        includePaths: z.boolean().optional(),
        includePoints: z.boolean().optional(),
        includeLinks: z.boolean().optional(),
        mergePathGroups: z.boolean().optional(),
      },
    },
    async (input) =>
      runLoggedMcpTool("build_export_bundle", input, async () =>
        jsonToolResult(await buildBundle(input)),
      ),
  );
}
