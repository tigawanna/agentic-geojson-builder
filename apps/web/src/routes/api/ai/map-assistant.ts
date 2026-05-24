import {
  mapAssistantRequestSchema,
  streamMapAgentChat,
} from "@/features/agentic-tools/geojson-agent.server";
import { readSessionFromHeaders } from "@/lib/auth.session.server";
import { toServerSentEventsResponse, type ModelMessage } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/map-assistant")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await readSessionFromHeaders(request.headers);
        if (!session?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const parsed = mapAssistantRequestSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const stream = await streamMapAgentChat({
            userId: session.user.id,
            mapId: parsed.data.mapId,
            messages: parsed.data.messages as ModelMessage[],
          });
          return toServerSentEventsResponse(stream);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Map assistant failed.";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
