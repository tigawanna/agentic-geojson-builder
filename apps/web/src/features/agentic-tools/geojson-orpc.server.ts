import "@tanstack/react-start/server-only";

import { serverEnv } from "@/lib/server-env";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createRouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { agenticCorsHeaders, agenticOpenApiBasePath, agenticRpcBasePath } from "./agentic-routes";
import { type AgenticInitialContext } from "./geojson-orpc-base.server";
import { geojsonAgenticRouter } from "./geojson-orpc-router.server";

export { geojsonAgenticRouter, type GeojsonAgenticRouter } from "./geojson-orpc-router.server";

const rpcHandler = new RPCHandler(geojsonAgenticRouter);
const openApiHandler = new OpenAPIHandler(geojsonAgenticRouter);

const openApiGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(agenticCorsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function agenticOptionsResponse(): Response {
  return new Response(null, { status: 204, headers: agenticCorsHeaders });
}

export async function handleAgenticRpcRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return agenticOptionsResponse();

  const { response } = await rpcHandler.handle(request, {
    prefix: agenticRpcBasePath,
    context: { headers: request.headers } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response("Not Found", { status: 404 }));
}

export async function handleAgenticOpenApiRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return agenticOptionsResponse();

  const { matched, response } = await openApiHandler.handle(request, {
    prefix: agenticOpenApiBasePath,
    context: { headers: request.headers } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response(matched ? null : "Not Found", { status: 404 }));
}

export async function getAgenticOpenApiSpec(): Promise<unknown> {
  return openApiGenerator.generate(geojsonAgenticRouter, {
    info: { title: "Agentic GeoJSON Builder API", version: "0.1.0" },
    servers: [{ url: `${serverEnv.FRONTEND_URL}${agenticOpenApiBasePath}` }],
  });
}

export function createGeojsonAgenticServerClient(userId: string) {
  return createRouterClient(geojsonAgenticRouter, {
    context: { userId } satisfies AgenticInitialContext,
  });
}
