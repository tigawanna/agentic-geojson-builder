import type { SegmentEdgeRecord } from "@shared/segments.types.js";
import type { FindRouteResult, RouteStep } from "@shared/routing.types.js";
import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";

type GraphEdge = {
  segmentEdgeId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  lengthM: number;
  bidirectional: boolean;
};

type AdjacencyEntry = {
  neighborRef: string;
  weight: number;
  segmentEdgeId: number;
  pathSlug: string;
  direction: "forward" | "reverse";
};

function buildAdjacency(edges: GraphEdge[]): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>();

  const add = (fromRef: string, entry: AdjacencyEntry) => {
    const list = adjacency.get(fromRef) ?? [];
    list.push(entry);
    adjacency.set(fromRef, list);
  };

  for (const edge of edges) {
    const weight = edge.lengthM > 0 ? edge.lengthM : 1;
    add(edge.fromRef, {
      neighborRef: edge.toRef,
      weight,
      segmentEdgeId: edge.segmentEdgeId,
      pathSlug: edge.pathSlug,
      direction: "forward",
    });

    if (edge.bidirectional) {
      add(edge.toRef, {
        neighborRef: edge.fromRef,
        weight,
        segmentEdgeId: edge.segmentEdgeId,
        pathSlug: edge.pathSlug,
        direction: "reverse",
      });
    }
  }

  return adjacency;
}

function dijkstra(
  adjacency: Map<string, AdjacencyEntry[]>,
  startRef: string,
  endRef: string,
): {
  distance: number;
  previous: Map<string, { ref: string; entry: AdjacencyEntry } | null>;
} | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, { ref: string; entry: AdjacencyEntry } | null>();
  const unvisited = new Set<string>();

  for (const ref of adjacency.keys()) {
    distances.set(ref, Number.POSITIVE_INFINITY);
    previous.set(ref, null);
    unvisited.add(ref);
  }

  if (!adjacency.has(startRef) || !adjacency.has(endRef)) {
    return null;
  }

  distances.set(startRef, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (const ref of unvisited) {
      const distance = distances.get(ref) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = ref;
      }
    }

    if (current === null || best === Number.POSITIVE_INFINITY) {
      break;
    }

    if (current === endRef) {
      break;
    }

    unvisited.delete(current);

    for (const entry of adjacency.get(current) ?? []) {
      if (!unvisited.has(entry.neighborRef)) {
        continue;
      }

      const alt = (distances.get(current) ?? Number.POSITIVE_INFINITY) + entry.weight;
      const neighborDistance = distances.get(entry.neighborRef) ?? Number.POSITIVE_INFINITY;
      if (alt < neighborDistance) {
        distances.set(entry.neighborRef, alt);
        previous.set(entry.neighborRef, { ref: current, entry });
      }
    }
  }

  const endDistance = distances.get(endRef);
  if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  return { distance: endDistance, previous };
}

function reconstructPath(
  previous: Map<string, { ref: string; entry: AdjacencyEntry } | null>,
  endRef: string,
): AdjacencyEntry[] {
  const steps: AdjacencyEntry[] = [];
  let current: string | null = endRef;

  while (current) {
    const prev = previous.get(current);
    if (!prev) {
      break;
    }
    steps.unshift(prev.entry);
    current = prev.ref;
  }

  return steps;
}

function mergeRouteGeometry(
  segments: SegmentEdgeRecord[],
  steps: RouteStep[],
): StoredLineStringGeometry {
  const coordinates: [number, number][] = [];

  for (const step of steps) {
    const segment = segments.find((item) => item.id === step.segmentEdgeId);
    if (!segment?.geometry) {
      continue;
    }

    const segmentCoords =
      step.direction === "reverse"
        ? [...segment.geometry.coordinates].reverse()
        : segment.geometry.coordinates;

    for (const coord of segmentCoords) {
      const last = coordinates.at(-1);
      if (last && last[0] === coord[0] && last[1] === coord[1]) {
        continue;
      }
      coordinates.push(coord);
    }
  }

  return { type: "LineString", coordinates: coordinates.length >= 2 ? coordinates : [] };
}

export function findRouteOnGraph(
  segments: SegmentEdgeRecord[],
  fromRef: string,
  toRef: string,
  viaRefs: string[] = [],
): FindRouteResult {
  const normalizedVia = viaRefs.filter((ref) => ref && ref !== fromRef && ref !== toRef);
  const waypointRefs = [fromRef, ...normalizedVia, toRef];

  const graphEdges: GraphEdge[] = segments
    .filter((segment) => segment.status !== "rejected")
    .map((segment) => ({
      segmentEdgeId: segment.id,
      fromRef: segment.fromRef,
      toRef: segment.toRef,
      pathSlug: segment.pathSlug,
      lengthM: segment.lengthM ?? 0,
      bidirectional: segment.bidirectional,
    }));

  const adjacency = buildAdjacency(graphEdges);
  const allSteps: RouteStep[] = [];
  let totalLengthM = 0;
  const nodeRefs: string[] = [fromRef];

  for (let index = 0; index < waypointRefs.length - 1; index += 1) {
    const legStart = waypointRefs[index];
    const legEnd = waypointRefs[index + 1];
    if (!legStart || !legEnd) {
      continue;
    }

    const result = dijkstra(adjacency, legStart, legEnd);
    if (!result) {
      return {
        fromRef,
        toRef,
        viaRefs: normalizedVia,
        totalLengthM: 0,
        nodeRefs: [],
        steps: [],
        geometry: { type: "LineString", coordinates: [] },
        found: false,
      };
    }

    totalLengthM += result.distance;
    const legSteps = reconstructPath(result.previous, legEnd);

    for (const step of legSteps) {
      const segment = segments.find((item) => item.id === step.segmentEdgeId);
      if (!segment) {
        continue;
      }

      allSteps.push({
        segmentEdgeId: step.segmentEdgeId,
        fromRef: step.direction === "forward" ? segment.fromRef : segment.toRef,
        toRef: step.direction === "forward" ? segment.toRef : segment.fromRef,
        pathSlug: step.pathSlug,
        lengthM: segment.lengthM ?? step.weight,
        direction: step.direction,
      });

      nodeRefs.push(step.neighborRef);
    }
  }

  return {
    fromRef,
    toRef,
    viaRefs: normalizedVia,
    totalLengthM: totalLengthM,
    nodeRefs,
    steps: allSteps,
    geometry: mergeRouteGeometry(segments, allSteps),
    found: allSteps.length > 0 || fromRef === toRef,
  };
}

export function listReachableFrom(
  segments: SegmentEdgeRecord[],
  fromRef: string,
): { reachableNodeRefs: string[]; reachableSegmentIds: number[] } {
  const graphEdges: GraphEdge[] = segments
    .filter((segment) => segment.status !== "rejected")
    .map((segment) => ({
      segmentEdgeId: segment.id,
      fromRef: segment.fromRef,
      toRef: segment.toRef,
      pathSlug: segment.pathSlug,
      lengthM: segment.lengthM ?? 0,
      bidirectional: segment.bidirectional,
    }));

  const adjacency = buildAdjacency(graphEdges);
  const visited = new Set<string>([fromRef]);
  const queue = [fromRef];
  const segmentIds = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const entry of adjacency.get(current) ?? []) {
      segmentIds.add(entry.segmentEdgeId);
      if (visited.has(entry.neighborRef)) {
        continue;
      }
      visited.add(entry.neighborRef);
      queue.push(entry.neighborRef);
    }
  }

  return {
    reachableNodeRefs: [...visited].sort(),
    reachableSegmentIds: [...segmentIds].sort((left, right) => left - right),
  };
}
