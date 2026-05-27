import { createServer, type Server } from "node:http";
import type { MapBaseMapStyle } from "../shared/maps.types.js";
import { TILE_SERVER_PORT } from "../shared/tile-cache.types.js";
import { log } from "./lib/logger.js";
import { readCachedTileForMap } from "./lib/tile-cache/tile-cache.service.js";

let tileServer: Server | null = null;

function parseTilePath(pathname: string) {
  const match = /^\/tiles\/(\d+)\/(outline|standard|satellite)\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(
    pathname,
  );
  if (!match) {
    return null;
  }

  return {
    mapId: Number(match[1]),
    style: match[2] as MapBaseMapStyle,
    z: Number(match[3]),
    x: Number(match[4]),
    y: Number(match[5]),
  };
}

export function getTileServerPort(): number {
  return TILE_SERVER_PORT;
}

export function isTileServerRunning(): boolean {
  return tileServer !== null;
}

export async function startTileServer(): Promise<void> {
  if (tileServer) {
    return;
  }

  tileServer = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!req.url) {
      res.statusCode = 400;
      res.end();
      return;
    }

    const url = new URL(req.url, "http://127.0.0.1");
    const parsed = parseTilePath(url.pathname);
    if (!parsed || req.method !== "GET") {
      res.statusCode = 404;
      res.end();
      return;
    }

    void readCachedTileForMap(parsed.mapId, parsed.style, parsed.z, parsed.x, parsed.y)
      .then((buffer) => {
        if (!buffer) {
          res.statusCode = 404;
          res.end();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.end(buffer);
      })
      .catch((error) => {
        log.error({
          action: "tile-server",
          message: "failed to read tile",
          error: error instanceof Error ? error.message : String(error),
        });
        res.statusCode = 500;
        res.end();
      });
  });

  await new Promise<void>((resolve, reject) => {
    tileServer!.listen(TILE_SERVER_PORT, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  log.info({
    action: "tile-server",
    message: "listening",
    url: `http://127.0.0.1:${TILE_SERVER_PORT}`,
  });
}

export async function stopTileServer(): Promise<void> {
  if (!tileServer) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    tileServer!.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  tileServer = null;
  log.info({ action: "tile-server", message: "stopped" });
}
