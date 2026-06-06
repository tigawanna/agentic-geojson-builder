import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";
import { buildMarkerNeighborIndex } from "@shared/marker-neighbor-index";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

export type FindNeighborPathResult = {
  pointIds: number[];
  totalDistanceMeters: number;
  found: boolean;
};

export type NeighborRouteLegAnalysis = {
  fromPointId: number;
  toPointId: number;
  found: boolean;
  pointIds: number[];
  distanceMeters: number;
};

export type AnalyzeNeighborRouteLegsResult = {
  legs: NeighborRouteLegAnalysis[];
  merged: FindNeighborPathResult;
};

export type NeighborPathCandidate = {
  pointIds: number[];
  totalDistanceMeters: number;
  found: boolean;
};

export type NeighborRouteLegAlternatives = {
  fromPointId: number;
  toPointId: number;
  paths: NeighborPathCandidate[];
};

export type NeighborRouteAlternativesResult = {
  directTopPaths: NeighborPathCandidate[];
  constrainedTopPaths: NeighborPathCandidate[];
  legTopPaths: NeighborRouteLegAlternatives[];
};

type WeightedEdge = {
  neighborId: number;
  weight: number;
};

function buildUndirectedAdjacency(
  neighbors: MarkerNeighborRecord[],
  pointsById: Map<number, MapPointRecord>,
): Map<number, WeightedEdge[]> {
  const adjacency = new Map<number, WeightedEdge[]>();

  const addEdge = (fromId: number, toId: number) => {
    if (fromId === toId) {
      return;
    }
    const from = pointsById.get(fromId);
    const to = pointsById.get(toId);
    if (!from || !to) {
      return;
    }
    const weight = haversineDistanceMeters(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );
    const normalizedWeight = weight > 0 ? weight : 1;
    const list = adjacency.get(fromId) ?? [];
    if (!list.some((entry) => entry.neighborId === toId)) {
      list.push({ neighborId: toId, weight: normalizedWeight });
      adjacency.set(fromId, list);
    }
  };

  for (const neighbor of neighbors) {
    addEdge(neighbor.fromMarkerId, neighbor.toMarkerId);
    addEdge(neighbor.toMarkerId, neighbor.fromMarkerId);
  }

  return adjacency;
}

function undirectedEdgeKey(fromId: number, toId: number): string {
  return fromId < toId ? `${fromId}:${toId}` : `${toId}:${fromId}`;
}

function pathsEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function pathKey(pointIds: number[]): string {
  return pointIds.join(",");
}

function measurePathDistance(adjacency: Map<number, WeightedEdge[]>, pointIds: number[]): number {
  let total = 0;
  for (let index = 0; index < pointIds.length - 1; index += 1) {
    const fromId = pointIds[index];
    const toId = pointIds[index + 1];
    if (fromId === undefined || toId === undefined) {
      continue;
    }
    const weight = adjacency.get(fromId)?.find((edge) => edge.neighborId === toId)?.weight;
    if (weight === undefined) {
      return Number.POSITIVE_INFINITY;
    }
    total += weight;
  }
  return total;
}

function dijkstraConstrained(
  adjacency: Map<number, WeightedEdge[]>,
  startId: number,
  endId: number,
  blockedEdges: ReadonlySet<string>,
  blockedNodes: ReadonlySet<number>,
): { distance: number; previous: Map<number, number | null> } | null {
  if (startId === endId) {
    return { distance: 0, previous: new Map([[endId, null]]) };
  }
  if (blockedNodes.has(startId) || blockedNodes.has(endId)) {
    return null;
  }

  const nodeIds = new Set<number>([...adjacency.keys(), startId, endId]);
  const distances = new Map<number, number>();
  const previous = new Map<number, number | null>();
  const unvisited = new Set<number>();

  for (const nodeId of nodeIds) {
    if (blockedNodes.has(nodeId)) {
      continue;
    }
    distances.set(nodeId, Number.POSITIVE_INFINITY);
    previous.set(nodeId, null);
    unvisited.add(nodeId);
  }

  if (!unvisited.has(startId) || !unvisited.has(endId)) {
    return null;
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: number | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = nodeId;
      }
    }

    if (current === null || best === Number.POSITIVE_INFINITY) {
      break;
    }

    if (current === endId) {
      break;
    }

    unvisited.delete(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.neighborId) || blockedNodes.has(edge.neighborId)) {
        continue;
      }
      if (blockedEdges.has(undirectedEdgeKey(current, edge.neighborId))) {
        continue;
      }
      const alt = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.weight;
      const neighborDistance = distances.get(edge.neighborId) ?? Number.POSITIVE_INFINITY;
      if (alt < neighborDistance) {
        distances.set(edge.neighborId, alt);
        previous.set(edge.neighborId, current);
      }
    }
  }

  const endDistance = distances.get(endId);
  if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  return { distance: endDistance, previous };
}

function dijkstra(
  adjacency: Map<number, WeightedEdge[]>,
  startId: number,
  endId: number,
): { distance: number; previous: Map<number, number | null> } | null {
  if (startId === endId) {
    return { distance: 0, previous: new Map([[endId, null]]) };
  }

  const nodeIds = new Set<number>([...adjacency.keys(), startId, endId]);
  const distances = new Map<number, number>();
  const previous = new Map<number, number | null>();
  const unvisited = new Set<number>();

  for (const nodeId of nodeIds) {
    distances.set(nodeId, Number.POSITIVE_INFINITY);
    previous.set(nodeId, null);
    unvisited.add(nodeId);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: number | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = nodeId;
      }
    }

    if (current === null || best === Number.POSITIVE_INFINITY) {
      break;
    }

    if (current === endId) {
      break;
    }

    unvisited.delete(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.neighborId)) {
        continue;
      }
      const alt = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.weight;
      const neighborDistance = distances.get(edge.neighborId) ?? Number.POSITIVE_INFINITY;
      if (alt < neighborDistance) {
        distances.set(edge.neighborId, alt);
        previous.set(edge.neighborId, current);
      }
    }
  }

  const endDistance = distances.get(endId);
  if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  return { distance: endDistance, previous };
}

function reconstructPointPath(previous: Map<number, number | null>, endId: number): number[] {
  const path: number[] = [];
  let current: number | null = endId;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  return path;
}

function mergeLegPaths(legPaths: number[][]): number[] {
  const merged: number[] = [];
  for (const leg of legPaths) {
    for (const pointId of leg) {
      if (merged.at(-1) === pointId) {
        continue;
      }
      merged.push(pointId);
    }
  }
  return merged;
}

export function mergeNeighborPathLegs(legPaths: number[][]): number[] {
  return mergeLegPaths(legPaths);
}

function toPathCandidate(
  adjacency: Map<number, WeightedEdge[]>,
  pointIds: number[],
): NeighborPathCandidate {
  return {
    pointIds,
    totalDistanceMeters: measurePathDistance(adjacency, pointIds),
    found: pointIds.length >= 2,
  };
}

function findKShortestPathsOnAdjacency(
  adjacency: Map<number, WeightedEdge[]>,
  startId: number,
  endId: number,
  limit: number,
): NeighborPathCandidate[] {
  if (limit <= 0) {
    return [];
  }
  if (startId === endId) {
    return [toPathCandidate(adjacency, [startId])];
  }

  const shortestPaths: number[][] = [];
  const first = dijkstra(adjacency, startId, endId);
  if (!first) {
    return [];
  }
  shortestPaths.push(reconstructPointPath(first.previous, endId));

  for (let pathIndex = 1; pathIndex < limit; pathIndex += 1) {
    const previousPath = shortestPaths[pathIndex - 1];
    if (!previousPath) {
      break;
    }

    const candidates: NeighborPathCandidate[] = [];

    for (let spurIndex = 0; spurIndex < previousPath.length - 1; spurIndex += 1) {
      const spurNode = previousPath[spurIndex];
      if (spurNode === undefined) {
        continue;
      }
      const rootPath = previousPath.slice(0, spurIndex + 1);
      const rootDistance = measurePathDistance(adjacency, rootPath);

      const blockedEdges = new Set<string>();
      const blockedNodes = new Set<number>(rootPath.slice(0, -1));

      for (const knownPath of shortestPaths) {
        if (knownPath.length <= spurIndex) {
          continue;
        }
        const sharesPrefix = rootPath.every((nodeId, index) => knownPath[index] === nodeId);
        if (!sharesPrefix) {
          continue;
        }
        const fromId = knownPath[spurIndex];
        const toId = knownPath[spurIndex + 1];
        if (fromId !== undefined && toId !== undefined) {
          blockedEdges.add(undirectedEdgeKey(fromId, toId));
        }
      }

      const spurResult = dijkstraConstrained(
        adjacency,
        spurNode,
        endId,
        blockedEdges,
        blockedNodes,
      );
      if (!spurResult) {
        continue;
      }

      const spurPath = reconstructPointPath(spurResult.previous, endId);
      const combinedPath = mergeLegPaths([rootPath, spurPath]);
      candidates.push({
        pointIds: combinedPath,
        totalDistanceMeters: rootDistance + spurResult.distance,
        found: combinedPath.length >= 2,
      });
    }

    if (candidates.length === 0) {
      break;
    }

    candidates.sort((left, right) => left.totalDistanceMeters - right.totalDistanceMeters);

    let nextPath: number[] | null = null;
    for (const candidate of candidates) {
      if (!shortestPaths.some((path) => pathsEqual(path, candidate.pointIds))) {
        nextPath = candidate.pointIds;
        break;
      }
    }

    if (!nextPath) {
      break;
    }

    shortestPaths.push(nextPath);
  }

  return shortestPaths.map((pointIds) => toPathCandidate(adjacency, pointIds));
}

function dedupePathCandidates(candidates: NeighborPathCandidate[]): NeighborPathCandidate[] {
  const seen = new Set<string>();
  const unique: NeighborPathCandidate[] = [];
  for (const candidate of candidates) {
    const key = pathKey(candidate.pointIds);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

function combineLegPathAlternatives(
  legOptions: NeighborPathCandidate[][],
  limit: number,
): NeighborPathCandidate[] {
  let merged: NeighborPathCandidate[] = [{ pointIds: [], totalDistanceMeters: 0, found: true }];

  for (const legPaths of legOptions) {
    const viableLegs = legPaths.filter((path) => path.found && path.pointIds.length >= 2);
    if (viableLegs.length === 0) {
      return [];
    }

    const next: NeighborPathCandidate[] = [];
    for (const prefix of merged) {
      for (const leg of viableLegs) {
        const pointIds =
          prefix.pointIds.length === 0
            ? leg.pointIds
            : mergeLegPaths([prefix.pointIds, leg.pointIds]);
        next.push({
          pointIds,
          totalDistanceMeters: prefix.totalDistanceMeters + leg.totalDistanceMeters,
          found: true,
        });
      }
    }

    merged = dedupePathCandidates(next)
      .sort((left, right) => left.totalDistanceMeters - right.totalDistanceMeters)
      .slice(0, Math.max(limit * 4, 12));
  }

  return dedupePathCandidates(merged)
    .sort((left, right) => left.totalDistanceMeters - right.totalDistanceMeters)
    .slice(0, limit);
}

export function findTopNeighborRouteAlternatives(input: {
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  fromPointId: number;
  toPointId: number;
  viaPointIds?: number[];
  limit?: number;
}): NeighborRouteAlternativesResult {
  const limit = input.limit ?? 3;
  const viaPointIds = (input.viaPointIds ?? []).filter(
    (pointId) => pointId !== input.fromPointId && pointId !== input.toPointId,
  );
  const waypointIds = [input.fromPointId, ...viaPointIds, input.toPointId];
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const adjacency = buildUndirectedAdjacency(input.neighbors, pointsById);

  const directTopPaths = findKShortestPathsOnAdjacency(
    adjacency,
    input.fromPointId,
    input.toPointId,
    limit,
  );

  const legTopPaths: NeighborRouteLegAlternatives[] = [];
  const legOptions: NeighborPathCandidate[][] = [];

  for (let index = 0; index < waypointIds.length - 1; index += 1) {
    const fromPointId = waypointIds[index];
    const toPointId = waypointIds[index + 1];
    if (fromPointId === undefined || toPointId === undefined) {
      continue;
    }

    const paths = findKShortestPathsOnAdjacency(adjacency, fromPointId, toPointId, limit);
    legTopPaths.push({ fromPointId, toPointId, paths });
    legOptions.push(paths);
  }

  const constrainedTopPaths =
    legOptions.length > 0 ? combineLegPathAlternatives(legOptions, limit) : [];

  return {
    directTopPaths,
    constrainedTopPaths,
    legTopPaths,
  };
}

export function findNeighborPath(input: {
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  fromPointId: number;
  toPointId: number;
  viaPointIds?: number[];
}): FindNeighborPathResult {
  const analysis = analyzeNeighborRouteLegs(input);
  return analysis.merged;
}

export function analyzeNeighborRouteLegs(input: {
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  fromPointId: number;
  toPointId: number;
  viaPointIds?: number[];
}): AnalyzeNeighborRouteLegsResult {
  const viaPointIds = (input.viaPointIds ?? []).filter(
    (pointId) => pointId !== input.fromPointId && pointId !== input.toPointId,
  );
  const waypointIds = [input.fromPointId, ...viaPointIds, input.toPointId];
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const adjacency = buildUndirectedAdjacency(input.neighbors, pointsById);

  const legs: NeighborRouteLegAnalysis[] = [];
  let totalDistanceMeters = 0;
  const legPaths: number[][] = [];

  for (let index = 0; index < waypointIds.length - 1; index += 1) {
    const startId = waypointIds[index];
    const endId = waypointIds[index + 1];
    if (startId === undefined || endId === undefined) {
      continue;
    }

    const result = dijkstra(adjacency, startId, endId);
    if (!result) {
      legs.push({
        fromPointId: startId,
        toPointId: endId,
        found: false,
        pointIds: [],
        distanceMeters: 0,
      });
      return {
        legs,
        merged: { pointIds: [], totalDistanceMeters: 0, found: false },
      };
    }

    const pointIds = reconstructPointPath(result.previous, endId);
    totalDistanceMeters += result.distance;
    legPaths.push(pointIds);
    legs.push({
      fromPointId: startId,
      toPointId: endId,
      found: true,
      pointIds,
      distanceMeters: result.distance,
    });
  }

  const pointIds = mergeLegPaths(legPaths);
  return {
    legs,
    merged: {
      pointIds,
      totalDistanceMeters,
      found: pointIds.length >= 2,
    },
  };
}

export function getUndirectedNeighborIds(
  neighbors: MarkerNeighborRecord[],
  markerId: number,
): number[] {
  const index = buildMarkerNeighborIndex(neighbors);
  const linked = new Set<number>([
    ...(index.outgoing.get(markerId) ?? []),
    ...(index.incoming.get(markerId) ?? []),
  ]);
  return [...linked].sort((left, right) => left - right);
}

export function markerHasNeighborGraphConnectivity(
  neighbors: MarkerNeighborRecord[],
  fromPointId: number,
  toPointId: number,
): boolean {
  if (fromPointId === toPointId) {
    return true;
  }
  const index = buildMarkerNeighborIndex(neighbors);
  const visited = new Set<number>([fromPointId]);
  const queue = [fromPointId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }
    if (current === toPointId) {
      return true;
    }
    const neighborIds = new Set<number>([
      ...(index.outgoing.get(current) ?? []),
      ...(index.incoming.get(current) ?? []),
    ]);
    for (const neighborId of neighborIds) {
      if (visited.has(neighborId)) {
        continue;
      }
      visited.add(neighborId);
      queue.push(neighborId);
    }
  }

  return false;
}
