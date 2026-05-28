import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Express } from "express";
import { log } from "@main/lib/logger.js";
import { createDesktopMcpServer } from "@main/mcp/create-desktop-mcp-server.js";

const MCP_PATH = "/mcp";

let httpServer: Server | null = null;
let expressApp: Express | null = null;
let listeningPort: number | null = null;
let startError: string | undefined;

const transports: Record<string, StreamableHTTPServerTransport> = {};

async function closeAllMcpSessions(): Promise<void> {
  const sessionIds = Object.keys(transports);
  await Promise.all(
    sessionIds.map(async (sessionId) => {
      try {
        await transports[sessionId]?.close();
      } catch (error) {
        log.error({
          action: "mcp",
          message: "failed to close MCP session transport",
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        delete transports[sessionId];
      }
    }),
  );
}

function attachRoutes(app: Express): void {
  app.options(MCP_PATH, (_req, res) => {
    res.status(204).end();
  });

  app.post(MCP_PATH, async (req, res) => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;

    try {
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (initializedSessionId) => {
            if (transport) {
              transports[initializedSessionId] = transport;
            }

            log.info({
              action: "mcp",
              message: "session initialized",
              sessionId: initializedSessionId,
            });
          },
        });

        transport.onclose = () => {
          const closedSessionId = transport?.sessionId;
          if (closedSessionId && transports[closedSessionId]) {
            delete transports[closedSessionId];
            log.info({
              action: "mcp",
              message: "session closed",
              sessionId: closedSessionId,
            });
          }
        };

        const server = createDesktopMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        log.warn({
          action: "mcp",
          message: "request rejected: missing or invalid session",
          hasSessionHeader: Boolean(sessionId),
          knownSession: sessionId ? Boolean(transports[sessionId]) : false,
          isInitialize: isInitializeRequest(req.body),
        });

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

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      log.error({
        action: "mcp",
        message: "request failed",
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

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
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (error) {
      log.error({
        action: "mcp",
        message: "SSE request failed",
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  app.delete(MCP_PATH, async (req, res) => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (error) {
      log.error({
        action: "mcp",
        message: "session termination failed",
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
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
  log.info({
    action: "mcp",
    message: "listening",
    url: `http://127.0.0.1:${port}${MCP_PATH}`,
  });
}

export async function stopMcpHttpServer(): Promise<void> {
  await closeAllMcpSessions();

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
  log.info({ action: "mcp", message: "stopped" });
}

export async function startMcpHttpServerSafe(port: number): Promise<boolean> {
  try {
    await startMcpHttpServer(port);
    return true;
  } catch (error) {
    startError = error instanceof Error ? error.message : String(error);
    log.error({
      action: "mcp",
      message: "failed to start",
      port,
      error: startError,
    });
    return false;
  }
}
