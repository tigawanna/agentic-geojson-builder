export type McpStatus = {
  enabled: boolean;
  running: boolean;
  port: number;
  url: string;
  error?: string;
};

export const DEFAULT_MCP_PORT = 3847;
