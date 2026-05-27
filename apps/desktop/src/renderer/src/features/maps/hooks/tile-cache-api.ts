import type { MapBaseMapStyle } from "@shared/maps.types";
import type { MapTileCacheConfig } from "@shared/tile-cache.types";

export const tileCacheQueryKeys = {
  all: ["tileCache"] as const,
  status: (mapId: number) => [...tileCacheQueryKeys.all, "status", mapId] as const,
};

export async function fetchTileCacheStatus(mapId: number): Promise<MapTileCacheConfig | null> {
  return window.api.invoke("tileCache:getStatus", { mapId });
}

export function resolveLocalTileUrl(
  mapId: number,
  style: MapBaseMapStyle,
  cache: MapTileCacheConfig | null | undefined,
): string | null {
  if (!cache?.builtAt || cache.tileCount <= 0 || cache.style !== style) {
    return null;
  }

  return `http://127.0.0.1:3848/tiles/${mapId}/${style}/{z}/{x}/{y}.png`;
}
