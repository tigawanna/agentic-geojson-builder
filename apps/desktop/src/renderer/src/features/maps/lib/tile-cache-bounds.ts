import type { TileCacheBounds, TileCacheCorner } from "@shared/tile-cache.types";

export function cornersFromBounds(bounds: TileCacheBounds): TileCacheCorner[] {
  return [
    { latitude: bounds.north, longitude: bounds.west },
    { latitude: bounds.north, longitude: bounds.east },
    { latitude: bounds.south, longitude: bounds.east },
    { latitude: bounds.south, longitude: bounds.west },
  ];
}
