import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types.js";

export function buildMarkerIdsWithNeighborLinks(neighbors: MarkerNeighborRecord[]): number[] {
  const ids = new Set<number>();
  for (const neighbor of neighbors) {
    ids.add(neighbor.fromMarkerId);
    ids.add(neighbor.toMarkerId);
  }
  return [...ids].sort((left, right) => left - right);
}

export function markerHasNeighborLinks(
  markerId: number,
  markerIdsWithNeighborLinks: ReadonlySet<number>,
): boolean {
  return markerIdsWithNeighborLinks.has(markerId);
}
