import { DEFAULT_MCP_PORT } from "@shared/mcp.types.js";
import { rawStore } from "@main/storage/backend-store.js";

export function getMcpEnabled(): boolean {
  return rawStore.get("mcpEnabled");
}

export function setMcpEnabled(enabled: boolean): void {
  rawStore.set("mcpEnabled", enabled);
}

export function getMcpPort(): number {
  return rawStore.get("mcpPort");
}

export function setMcpPort(port: number): void {
  rawStore.set("mcpPort", port);
}

export function getDefaultMcpPort(): number {
  return DEFAULT_MCP_PORT;
}
