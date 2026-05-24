import { handleAgenticRpcRequest } from "@/features/agentic-tools/geojson-orpc.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agentic/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }: { request: Request }) => handleAgenticRpcRequest(request),
    },
  },
});
