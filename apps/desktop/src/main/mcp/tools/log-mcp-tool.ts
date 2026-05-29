import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { log } from "@main/lib/logger.js";

function summarizeMcpInput(input: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "geometry" && value && typeof value === "object" && "coordinates" in value) {
      const coordinates = (value as { coordinates: unknown }).coordinates;
      summary[key] = {
        type: (value as { type?: string }).type,
        coordinateCount: Array.isArray(coordinates) ? coordinates.length : 0,
      };
      continue;
    }
    if (key === "guides" && Array.isArray(value)) {
      summary[key] = value.map((guide) => {
        if (!guide || typeof guide !== "object") {
          return guide;
        }
        const entry = guide as { id?: string; name?: string; coordinates?: unknown[] };
        return {
          id: entry.id,
          name: entry.name,
          coordinateCount: Array.isArray(entry.coordinates) ? entry.coordinates.length : 0,
        };
      });
      continue;
    }
    if (key === "lines" && Array.isArray(value)) {
      summary[key] = value.map((line) => {
        if (!line || typeof line !== "object") {
          return line;
        }
        const entry = line as { id?: string; name?: string; coordinates?: unknown[] };
        return {
          id: entry.id,
          name: entry.name,
          coordinateCount: Array.isArray(entry.coordinates) ? entry.coordinates.length : 0,
        };
      });
      continue;
    }
    summary[key] = value;
  }
  return summary;
}

function summarizeMcpResult(toolName: string, result: CallToolResult) {
  const structured = result.structuredContent;
  if (!structured || typeof structured !== "object") {
    return { hasStructuredContent: false };
  }

  const record = structured as Record<string, unknown>;
  if ("segment" in record && record.segment && typeof record.segment === "object") {
    const segment = record.segment as {
      id?: number;
      mapId?: number;
      segmentGroupId?: string;
      geometry?: { coordinates?: unknown[] };
    };
    return {
      segmentId: segment.id,
      mapId: segment.mapId,
      segmentGroupId: segment.segmentGroupId,
      vertexCount: segment.geometry?.coordinates?.length ?? 0,
    };
  }

  if ("segments" in record && Array.isArray(record.segments)) {
    return { segmentCount: record.segments.length };
  }

  if ("deleted" in record) {
    return { deleted: record.deleted, segmentId: record.segmentId };
  }

  if ("intersectionCount" in record) {
    return { intersectionCount: record.intersectionCount };
  }

  if ("snappedCount" in record) {
    return {
      snappedCount: record.snappedCount,
      totalVertices: record.totalVertices,
    };
  }

  return { keys: Object.keys(record), toolName };
}

export async function runLoggedMcpTool<T extends Record<string, unknown>>(
  toolName: string,
  input: T,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  log.info({
    action: "mcp.tool",
    message: "call started",
    toolName,
    input: summarizeMcpInput(input),
  });

  try {
    const result = await run();
    log.info({
      action: "mcp.tool",
      message: "call completed",
      toolName,
      durationMs: Date.now() - startedAt,
      isError: Boolean(result.isError),
      result: summarizeMcpResult(toolName, result),
    });
    return result;
  } catch (error) {
    log.error({
      action: "mcp.tool",
      message: "call failed",
      toolName,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
