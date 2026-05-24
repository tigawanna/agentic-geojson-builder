import "@tanstack/react-start/server-only";

import { chat, toolDefinition, type ModelMessage, type StreamChunk } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { serverEnv } from "@/lib/server-env";
import { z } from "zod";
import { createGeojsonAgenticServerClient } from "./geojson-orpc-client.server";
import {
  applyFeaturePatchToolInputSchema,
  applyFeaturePatchToolOutputSchema,
  exportGeoJsonToolInputSchema,
  exportGeoJsonToolOutputSchema,
  findFeatureGapsToolInputSchema,
  findFeatureGapsToolOutputSchema,
  getProjectContextToolOutputSchema,
  listFeatureSegmentsToolOutputSchema,
  mergeFeatureSegmentsToolInputSchema,
  mergeFeatureSegmentsToolOutputSchema,
  updateFeatureSegmentStatusToolInputSchema,
  updateFeatureSegmentStatusToolOutputSchema,
} from "./geojson-tool-schemas";

const exportMapGeoJsonInputSchema = exportGeoJsonToolInputSchema.omit({ mapId: true });

const applyTrailPatchInputSchema = applyFeaturePatchToolInputSchema.omit({ mapId: true });

const findTrailGapsInputSchema = findFeatureGapsToolInputSchema.omit({ mapId: true });

const mergeTrailSegmentsInputSchema = mergeFeatureSegmentsToolInputSchema.omit({ mapId: true });

const updateTrailSegmentStatusInputSchema = updateFeatureSegmentStatusToolInputSchema.omit({
  mapId: true,
});

const getMapProjectContextToolDefinition = toolDefinition({
  name: "get_map_project_context",
  description:
    "Load map metadata, reference points, georeference status, and trail segment summaries for the active map.",
  outputSchema: getProjectContextToolOutputSchema,
});

const listTrailSegmentsToolDefinition = toolDefinition({
  name: "list_trail_segments",
  description: "List full trail segment geometries for the active map.",
  outputSchema: listFeatureSegmentsToolOutputSchema,
});

const exportMapGeoJsonToolDefinition = toolDefinition({
  name: "export_map_geojson",
  description: "Build a GeoJSON FeatureCollection from saved trail segments on the active map.",
  inputSchema: exportMapGeoJsonInputSchema,
  outputSchema: exportGeoJsonToolOutputSchema,
});

const applyTrailPatchToolDefinition = toolDefinition({
  name: "apply_trail_patch",
  description:
    "Upsert or delete a trail segment on the active map. Prefer pdf-pixels coordinate space for traces derived from the PDF.",
  inputSchema: applyTrailPatchInputSchema,
  outputSchema: applyFeaturePatchToolOutputSchema,
});

const findTrailGapsToolDefinition = toolDefinition({
  name: "find_trail_gaps",
  description:
    "Detect endpoint gaps between consecutive segments in the same trail group. Use before merging or export.",
  inputSchema: findTrailGapsInputSchema,
  outputSchema: findFeatureGapsToolOutputSchema,
});

const mergeTrailSegmentsToolDefinition = toolDefinition({
  name: "merge_trail_segments",
  description:
    "Preview merged LineStrings for each trail group without persisting changes. Use mergeGroups on export to write merged GeoJSON.",
  inputSchema: mergeTrailSegmentsInputSchema,
  outputSchema: mergeFeatureSegmentsToolOutputSchema,
});

const updateTrailSegmentStatusToolDefinition = toolDefinition({
  name: "update_trail_segment_status",
  description: "Accept, reject, or mark a trail segment for review on the active map.",
  inputSchema: updateTrailSegmentStatusInputSchema,
  outputSchema: updateFeatureSegmentStatusToolOutputSchema,
});

function buildSystemPrompt(mapId: number): string {
  return [
    "You are an expert geospatial digitization assistant for PDF trail maps.",
    `The active map id is ${mapId}. All tools operate on this map automatically.`,
    "Rules:",
    "- Always call get_map_project_context before giving map-specific advice.",
    "- Ground answers in tool results. Do not invent coordinates, trails, or reference points.",
    "- Trail segments are stored as draft LineStrings until a human accepts them.",
    "- Use apply_trail_patch only when the user explicitly asks to create, update, or delete a trail segment.",
    "- When tracing from the PDF, use coordinateSpace pdf-pixels unless the user provides WGS84 coordinates.",
    "- Prefer small, reviewable segment patches over one giant geometry.",
    "- Use find_trail_gaps to check continuity before merging segments or exporting.",
    "- Use update_trail_segment_status when the user wants to accept or reject a segment.",
    "- After mutating segments, tell the user they may need to refresh the map workspace to see changes.",
    "- Be practical and concise.",
  ].join("\n\n");
}

function resolveOpenRouterModel() {
  return (serverEnv.OPENROUTER_MODEL ?? "openai/gpt-4o-mini") as Parameters<
    typeof createOpenRouterText
  >[0];
}

export async function streamMapAgentChat(input: {
  userId: string;
  mapId: number;
  messages: ModelMessage[];
}): Promise<AsyncIterable<StreamChunk>> {
  if (!serverEnv.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const client = createGeojsonAgenticServerClient(input.userId);
  const mapId = input.mapId;

  const getMapProjectContext = getMapProjectContextToolDefinition.server(async () =>
    client.project.context({ mapId }),
  );

  const listTrailSegments = listTrailSegmentsToolDefinition.server(async () =>
    client.featureSegments.list({ mapId }),
  );

  const exportMapGeoJson = exportMapGeoJsonToolDefinition.server(async (toolInput) =>
    client.export.geojson({
      mapId,
      segmentGroupId: toolInput.segmentGroupId,
      statuses: toolInput.statuses,
      mergeGroups: toolInput.mergeGroups,
      snapToleranceMeters: toolInput.snapToleranceMeters,
    }),
  );

  const applyTrailPatch = applyTrailPatchToolDefinition.server(async (toolInput) =>
    client.featureSegments.patch({
      mapId,
      ...toolInput,
    }),
  );

  const findTrailGaps = findTrailGapsToolDefinition.server(async (toolInput) =>
    client.featureSegments.findGaps({
      mapId,
      ...toolInput,
    }),
  );

  const mergeTrailSegments = mergeTrailSegmentsToolDefinition.server(async (toolInput) =>
    client.featureSegments.merge({
      mapId,
      ...toolInput,
    }),
  );

  const updateTrailSegmentStatus = updateTrailSegmentStatusToolDefinition.server(
    async (toolInput) =>
      client.featureSegments.updateStatus({
        mapId,
        ...toolInput,
      }),
  );

  return chat({
    adapter: createOpenRouterText(resolveOpenRouterModel(), serverEnv.OPENROUTER_API_KEY, {
      httpReferer: serverEnv.FRONTEND_URL,
    }),
    messages: input.messages,
    systemPrompts: [buildSystemPrompt(mapId)],
    tools: [
      getMapProjectContext,
      listTrailSegments,
      findTrailGaps,
      mergeTrailSegments,
      exportMapGeoJson,
      applyTrailPatch,
      updateTrailSegmentStatus,
    ],
  });
}

export const mapAssistantRequestSchema = z.object({
  mapId: z.number().int().positive(),
  messages: z.array(z.unknown()).min(1),
});
