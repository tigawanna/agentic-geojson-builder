import "@tanstack/react-start/server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createGeojsonAgenticServerClient } from "./geojson-orpc-client.server";
import {
  createControlPointToolInputSchema,
  createMapToolInputSchema,
  deleteControlPointToolInputSchema,
  listMapsToolInputSchema,
  lonLatToolInputSchema,
  mapIdInputSchema,
  pdfPixelToolInputSchema,
  saveMapPdfToolInputSchema,
  updateControlPointToolInputSchema,
  updateMapWorkspaceToolInputSchema,
} from "./geojson-tool-schemas";

function jsonToolResult<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function createGeojsonMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "agentic-geojson-builder",
    version: "0.1.0",
  });
  const client = createGeojsonAgenticServerClient(userId);

  server.registerTool(
    "list_maps",
    {
      title: "List Maps",
      description: "List paginated maps for the authenticated user.",
      inputSchema: listMapsToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.list(input)),
  );

  server.registerTool(
    "get_map_workspace",
    {
      title: "Get Map Workspace",
      description: "Load map metadata and workspace preferences.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.workspace(input)),
  );

  server.registerTool(
    "create_map",
    {
      title: "Create Map",
      description: "Create a new map project.",
      inputSchema: createMapToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.create(input)),
  );

  server.registerTool(
    "update_map_workspace",
    {
      title: "Update Map Workspace",
      description: "Update viewport, PDF transform, and base map style.",
      inputSchema: updateMapWorkspaceToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.updateWorkspace(input)),
  );

  server.registerTool(
    "delete_map",
    {
      title: "Delete Map",
      description: "Delete a map and its control points.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.delete(input)),
  );

  server.registerTool(
    "save_map_pdf",
    {
      title: "Save Map PDF",
      description: "Upload or replace the PDF bytea for a map.",
      inputSchema: saveMapPdfToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.savePdf(input)),
  );

  server.registerTool(
    "load_map_pdf",
    {
      title: "Load Map PDF",
      description: "Download the stored PDF as base64.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.maps.loadPdf(input)),
  );

  server.registerTool(
    "list_control_points",
    {
      title: "List Control Points",
      description: "List georeferencing control points for a map.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.controlPoints.list(input)),
  );

  server.registerTool(
    "create_control_point",
    {
      title: "Create Control Point",
      description: "Create a PDF pixel to WGS84 control point pair.",
      inputSchema: createControlPointToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.controlPoints.create(input)),
  );

  server.registerTool(
    "update_control_point",
    {
      title: "Update Control Point",
      description: "Update an existing control point pair.",
      inputSchema: updateControlPointToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.controlPoints.update(input)),
  );

  server.registerTool(
    "delete_control_point",
    {
      title: "Delete Control Point",
      description: "Delete a control point from a map.",
      inputSchema: deleteControlPointToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.controlPoints.delete(input)),
  );

  server.registerTool(
    "get_project_context",
    {
      title: "Get Project Context",
      description: "Aggregated map, control points, and georeference status.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.project.context(input)),
  );

  server.registerTool(
    "compute_georeference",
    {
      title: "Compute Georeference",
      description: "Recompute and persist the affine transform from control points.",
      inputSchema: mapIdInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.georeference.compute(input)),
  );

  server.registerTool(
    "pdf_pixel_to_lon_lat",
    {
      title: "PDF Pixel To Lon Lat",
      description: "Convert PDF canvas pixel coordinates to WGS84.",
      inputSchema: pdfPixelToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.georeference.pdfPixelToLonLat(input)),
  );

  server.registerTool(
    "lon_lat_to_pdf_pixel",
    {
      title: "Lon Lat To PDF Pixel",
      description: "Convert WGS84 coordinates to PDF canvas pixels.",
      inputSchema: lonLatToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.georeference.lonLatToPdfPixel(input)),
  );

  return server;
}
