import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AGENT_TRAIL_SEGMENT_DRAWING_GUIDE,
  TRAIL_SEGMENT_DRAWING_PROMPT_DESCRIPTION,
  TRAIL_SEGMENT_DRAWING_PROMPT_NAME,
} from "@shared/agent-trail-segment-drawing-guide.js";
import { jsonToolResult } from "./mcp-result-helpers.js";

const SEGMENT_DRAWING_GUIDE_URI = "guide://agentic-geojson/trail-segment-drawing";

export function registerSegmentDrawingGuide(server: McpServer) {
  server.registerPrompt(
    TRAIL_SEGMENT_DRAWING_PROMPT_NAME,
    {
      title: "Draw trail segment",
      description: TRAIL_SEGMENT_DRAWING_PROMPT_DESCRIPTION,
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: AGENT_TRAIL_SEGMENT_DRAWING_GUIDE,
          },
        },
      ],
    }),
  );

  server.registerResource(
    "trail_segment_drawing_guide",
    SEGMENT_DRAWING_GUIDE_URI,
    {
      title: "Trail segment drawing guide",
      description: TRAIL_SEGMENT_DRAWING_PROMPT_DESCRIPTION,
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: SEGMENT_DRAWING_GUIDE_URI,
          mimeType: "text/markdown",
          text: AGENT_TRAIL_SEGMENT_DRAWING_GUIDE,
        },
      ],
    }),
  );

  server.registerTool(
    "get_trail_segment_drawing_guide",
    {
      title: "Get Trail Segment Drawing Guide",
      description:
        "Returns the full agent guide for drawing trail segments correctly. " +
        "MUST be called before your first apply_feature_patch to avoid coordinate errors.",
      inputSchema: {},
    },
    async () =>
      jsonToolResult({
        guide: AGENT_TRAIL_SEGMENT_DRAWING_GUIDE,
        promptName: TRAIL_SEGMENT_DRAWING_PROMPT_NAME,
        resourceUri: SEGMENT_DRAWING_GUIDE_URI,
      }),
  );
}
