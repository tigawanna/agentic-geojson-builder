import type { McpStatus } from "@shared/mcp.types.js";
import { log } from "@main/lib/logger.js";
import { getMcpEnabled, getMcpPort } from "@main/storage/app-settings.js";
import {
  getMcpListenPort,
  getMcpStartError,
  isMcpHttpServerRunning,
  startMcpHttpServerSafe,
  stopMcpHttpServer,
} from "@main/mcp/http-server.js";

function buildMcpUrl(port: number): string {
  return `http://127.0.0.1:${port}/mcp`;
}

export function getMcpStatus(): McpStatus {
  const enabled = getMcpEnabled();
  const port = getMcpPort();
  const running = isMcpHttpServerRunning();
  const activePort = getMcpListenPort() ?? port;

  return {
    enabled,
    running,
    port: activePort,
    url: buildMcpUrl(activePort),
    error: getMcpStartError(),
  };
}

export async function syncMcpServer(): Promise<McpStatus> {
  const enabled = getMcpEnabled();
  const port = getMcpPort();

  if (!enabled) {
    await stopMcpHttpServer();
    return getMcpStatus();
  }

  const started = await startMcpHttpServerSafe(port);
  if (!started) {
    log.warn({
      action: "mcp",
      message: "could not bind to port",
      port,
    });
  }

  return getMcpStatus();
}

export async function initMcpServer(): Promise<McpStatus> {
  return syncMcpServer();
}

export async function shutdownMcpServer(): Promise<void> {
  await stopMcpHttpServer();
}
