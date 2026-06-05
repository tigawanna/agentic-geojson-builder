import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types.js";

export type MarkerNeighborIndex = {
  outgoing: Map<number, Set<number>>;
  incoming: Map<number, Set<number>>;
};

export function buildMarkerNeighborIndex(neighbors: MarkerNeighborRecord[]): MarkerNeighborIndex {
  const outgoing = new Map<number, Set<number>>();
  const incoming = new Map<number, Set<number>>();

  for (const neighbor of neighbors) {
    const out = outgoing.get(neighbor.fromMarkerId) ?? new Set();
    out.add(neighbor.toMarkerId);
    outgoing.set(neighbor.fromMarkerId, out);

    const inc = incoming.get(neighbor.toMarkerId) ?? new Set();
    inc.add(neighbor.fromMarkerId);
    incoming.set(neighbor.toMarkerId, inc);
  }

  return { outgoing, incoming };
}

export function getMarkerNeighborIds(index: MarkerNeighborIndex, markerId: number): number[] {
  return [...(index.outgoing.get(markerId) ?? [])];
}
