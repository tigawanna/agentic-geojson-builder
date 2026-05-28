import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AGENT_CONTROL_POINT_PLACEMENT_GUIDE,
  CONTROL_POINT_PLACEMENT_PROMPT_DESCRIPTION,
  CONTROL_POINT_PLACEMENT_PROMPT_NAME,
} from "@shared/agent-control-point-placement-guide.js";
import { jsonToolResult } from "./mcp-result-helpers.js";

const PLACEMENT_GUIDE_URI = "guide://agentic-geojson/control-point-placement";

export function registerPlacementGuide(server: McpServer) {
  server.registerPrompt(
    CONTROL_POINT_PLACEMENT_PROMPT_NAME,
    {
      title: "Place reference point",
      description: CONTROL_POINT_PLACEMENT_PROMPT_DESCRIPTION,
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: AGENT_CONTROL_POINT_PLACEMENT_GUIDE,
          },
        },
      ],
    }),
  );

  server.registerResource(
    "control_point_placement_guide",
    PLACEMENT_GUIDE_URI,
    {
      title: "Control point placement guide",
      description: CONTROL_POINT_PLACEMENT_PROMPT_DESCRIPTION,
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: PLACEMENT_GUIDE_URI,
          mimeType: "text/markdown",
          text: AGENT_CONTROL_POINT_PLACEMENT_GUIDE,
        },
      ],
    }),
  );

  server.registerTool(
    "get_reference_point_placement_guide",
    {
      title: "Get Reference Point Placement Guide",
      description:
        "Returns the full agent guide for placing PDF-to-map reference points. " +
        "Call this before your first placement, or use the place_reference_point MCP prompt.",
      inputSchema: {},
    },
    async () =>
      jsonToolResult({
        guide: AGENT_CONTROL_POINT_PLACEMENT_GUIDE,
        promptName: CONTROL_POINT_PLACEMENT_PROMPT_NAME,
        resourceUri: PLACEMENT_GUIDE_URI,
      }),
  );
}
