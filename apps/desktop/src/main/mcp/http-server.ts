import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Express } from "express";
import log from "electron-log/main";
import { createDesktopMcpServer } from "./create-desktop-mcp-server.js";

const MCP_PATH = "/mcp";

type ActiveTransport = StreamableHTTPServerTransport;

let httpServer: Server | null = null;
let expressApp: Express | null = null;
let listeningPort: number | null = null;
let startError: string | undefined;
const transports = new Map<string, ActiveTransport>();

function attachRoutes(app: Express): void {
  app.options(MCP_PATH, (_req, res) => {
    res.status(204).end();
  });

  app.post(MCP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    let transport: ActiveTransport | undefined;

    try {
      if (typeof sessionId === "string" && transports.has(sessionId)) {
        transport = transports.get(sessionId);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (nextSessionId) => {
            if (transport) {
              transports.set(nextSessionId, transport);
            }
          },
        });

        transport.onclose = () => {
          const closedSessionId = transport?.sessionId;
          if (closedSessionId) {
            transports.delete(closedSessionId);
          }
        };

        const server = createDesktopMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      if (!transport) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Unknown MCP session",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
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

  app.get(MCP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId !== "string" || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.delete(MCP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId !== "string" || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(req, res);
  });
}

async function closeTransports(): Promise<void> {
  await Promise.all(
    [...transports.values()].map(async (transport) => {
      await transport.close();
    }),
  );
  transports.clear();
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
  await closeTransports();

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
