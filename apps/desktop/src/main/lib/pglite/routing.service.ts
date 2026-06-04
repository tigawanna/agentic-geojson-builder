import type { FindRouteInput, ReachableFromInput } from "@shared/routing.types.js";
import { findRouteOnGraph, listReachableFrom } from "@main/lib/routing/route-graph.js";
import { listSegmentEdges } from "@main/lib/pglite/segment-edges.service.js";

export async function findRoute(input: FindRouteInput) {
  const segments = await listSegmentEdges(input.mapId);
  return findRouteOnGraph(segments, input.fromRef.trim(), input.toRef.trim(), input.viaRefs ?? []);
}

export async function reachableFrom(input: ReachableFromInput) {
  const segments = await listSegmentEdges(input.mapId);
  const result = listReachableFrom(segments, input.fromRef.trim());
  return {
    fromRef: input.fromRef.trim(),
    reachableNodeRefs: result.reachableNodeRefs,
    reachableSegmentIds: result.reachableSegmentIds,
  };
}
