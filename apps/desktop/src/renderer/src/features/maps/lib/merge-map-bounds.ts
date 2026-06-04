import type { MapBounds } from "@renderer/features/maps/lib/map-handle";

export function mergeMapBounds(boundsList: Array<MapBounds | null>): MapBounds | null {
  const valid = boundsList.filter((bounds): bounds is MapBounds => bounds !== null);
  if (valid.length === 0) {
    return null;
  }

  const first = valid[0]!;
  const rest = valid.slice(1);
  return rest.reduce<MapBounds>(
    (merged, bounds) => ({
      north: Math.max(merged.north, bounds.north),
      south: Math.min(merged.south, bounds.south),
      east: Math.max(merged.east, bounds.east),
      west: Math.min(merged.west, bounds.west),
    }),
    first,
  );
}
