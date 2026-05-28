import type { TileCacheBounds } from "./tile-cache.types.js";
import type { TileCacheCoverage } from "./rendered-map-view.types.js";

type ViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function overlapFraction(viewport: ViewportBounds, cache: ViewportBounds): number {
  const viewArea =
    Math.max(viewport.east - viewport.west, 0) * Math.max(viewport.north - viewport.south, 0);

  if (viewArea <= 0) {
    return 0;
  }

  const overlapWest = clamp(cache.west, viewport.west, viewport.east);
  const overlapEast = clamp(cache.east, viewport.west, viewport.east);
  const overlapSouth = clamp(cache.south, viewport.south, viewport.north);
  const overlapNorth = clamp(cache.north, viewport.south, viewport.north);

  const overlapArea =
    Math.max(overlapEast - overlapWest, 0) * Math.max(overlapNorth - overlapSouth, 0);

  return overlapArea / viewArea;
}

export function computeTileCacheCoverage(
  viewport: ViewportBounds,
  tileCacheConfig: { bounds: TileCacheBounds } | null,
): TileCacheCoverage {
  if (!tileCacheConfig) {
    return {
      hasTileCache: false,
      viewportFullyCovered: false,
      overlapPercent: 0,
      cacheBounds: null,
    };
  }

  const cache = tileCacheConfig.bounds;
  const fraction = overlapFraction(viewport, cache);
  const percent = Math.round(fraction * 100);

  return {
    hasTileCache: true,
    viewportFullyCovered: percent >= 99,
    overlapPercent: percent,
    cacheBounds: {
      north: cache.north,
      south: cache.south,
      east: cache.east,
      west: cache.west,
    },
  };
}
