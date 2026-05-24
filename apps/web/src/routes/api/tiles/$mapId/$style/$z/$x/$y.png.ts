import { readCachedTileForUser } from "@/data-access-layer/tile-cache/tile-cache.server";
import { readSessionFromHeaders } from "@/lib/auth.session.server";
import { createFileRoute } from "@tanstack/react-router";

const tileStyleSchema = new Set(["outline", "standard", "satellite"]);

export const Route = createFileRoute("/api/tiles/$mapId/$style/$z/$x/$y/png")({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request;
        params: { mapId: string; style: string; z: string; x: string; y: string };
      }) => {
        const session = await readSessionFromHeaders(request.headers);
        if (!session?.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        const mapId = Number(params.mapId);
        const z = Number(params.z);
        const x = Number(params.x);
        const y = Number(params.y.replace(/\.png$/, ""));

        if (
          !Number.isInteger(mapId) ||
          mapId <= 0 ||
          !tileStyleSchema.has(params.style) ||
          !Number.isInteger(z) ||
          !Number.isInteger(x) ||
          !Number.isInteger(y)
        ) {
          return new Response("Bad Request", { status: 400 });
        }

        try {
          const tile = await readCachedTileForUser(session.user.id, {
            mapId,
            style: params.style as "outline" | "standard" | "satellite",
            z,
            x,
            y,
          });

          if (!tile) {
            return new Response("Not Found", { status: 404 });
          }

          return new Response(new Uint8Array(tile), {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch {
          return new Response("Not Found", { status: 404 });
        }
      },
    },
  },
});
