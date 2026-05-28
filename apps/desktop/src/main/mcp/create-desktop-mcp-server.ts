import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMapTools } from "@main/mcp/tools/register-map-tools.js";
import { registerTileCacheTools } from "@main/mcp/tools/register-tile-cache-tools.js";
import { registerControlPointTools } from "@main/mcp/tools/register-control-point-tools.js";
import { registerPlacementGuide } from "@main/mcp/tools/register-placement-guide.js";
import { registerViewportTools } from "@main/mcp/tools/register-viewport-tools.js";

export function createDesktopMcpServer(): McpServer {
  const server = new McpServer({
    name: "agentic-geojson-desktop",
    version: "0.1.0",
  });

  registerPlacementGuide(server);
  registerMapTools(server);
  registerTileCacheTools(server);
  registerControlPointTools(server);
  registerViewportTools(server);

  return server;
}
