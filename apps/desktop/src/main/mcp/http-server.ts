import type { Server } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express } from "express";
import log from "electron-log/main";
import { createDesktopMcpServer } from "./create-desktop-mcp-server.js";

const MCP_PATH = "/mcp";

let httpServer: Server | null = null;
let expressApp: Express | null = null;
let listeningPort: number | null = null;
let startError: string | undefined;

function attachRoutes(app: Express): void {
  app.options(MCP_PATH, (_req, res) => {
    res.status(204).end();
  });

  app.post(MCP_PATH, async (req, res) => {
    const server = createDesktopMcpServer();

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      log.error("[mcp] request failed", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get(MCP_PATH, (_req, res) => {
    res
      .status(405)
      .set("Allow", "POST")
      .json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      });
  });

  app.delete(MCP_PATH, (_req, res) => {
    res
      .status(405)
      .set("Allow", "POST")
      .json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      });
  });
}

export function getMcpListenPort(): number | null {
  return listeningPort;
}

export function getMcpStartError(): string | undefined {
  return startError;
}

export function isMcpHttpServerRunning(): boolean {
  return httpServer !== null && listeningPort !== null;
}

export async function startMcpHttpServer(port: number): Promise<void> {
  if (httpServer && listeningPort === port) {
    return;
  }

  await stopMcpHttpServer();

  expressApp = createMcpExpressApp({ host: "127.0.0.1" });
  attachRoutes(expressApp);

  await new Promise<void>((resolve, reject) => {
    const server = expressApp!.listen(port, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
    httpServer = server;
  });

  listeningPort = port;
  startError = undefined;
  log.info(`[mcp] listening on http://127.0.0.1:${port}${MCP_PATH}`);
}

export async function stopMcpHttpServer(): Promise<void> {
  if (!httpServer) {
    listeningPort = null;
    startError = undefined;
    expressApp = null;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    httpServer!.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  httpServer = null;
  expressApp = null;
  listeningPort = null;
  startError = undefined;
  log.info("[mcp] stopped");
}

export async function startMcpHttpServerSafe(port: number): Promise<boolean> {
  try {
    await startMcpHttpServer(port);
    return true;
  } catch (error) {
    startError = error instanceof Error ? error.message : String(error);
    log.error("[mcp] failed to start", error);
    return false;
  }
}
