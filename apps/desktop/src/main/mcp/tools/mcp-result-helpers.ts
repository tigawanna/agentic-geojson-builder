import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MapSectorViewResult } from "@shared/tile-cache.types.js";
import type { GetRenderedMapViewResult } from "@shared/rendered-map-view.types.js";
import {
  renderedMapViewStructuredResult,
  renderedMapViewToolResult,
} from "@main/lib/workspace-snapshot/workspace-snapshot.service.js";

export function jsonToolResult(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function mapSectorToolResult(data: MapSectorViewResult): CallToolResult {
  const { imageBase64, ...summary } = data;
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: {
      ...summary,
      hasImage: true,
      imageBase64Length: imageBase64.length,
    },
  };
}

export function renderedMapViewMcpResult(data: GetRenderedMapViewResult): CallToolResult {
  const payload = renderedMapViewToolResult(data);
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: renderedMapViewStructuredResult(data),
  };
}
