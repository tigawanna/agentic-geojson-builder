import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";

export type FindRouteInput = {
  mapId: number;
  fromRef: string;
  toRef: string;
  viaRefs?: string[];
};

export type RouteStep = {
  segmentEdgeId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  lengthM: number;
  direction: "forward" | "reverse";
};

export type FindRouteResult = {
  fromRef: string;
  toRef: string;
  viaRefs: string[];
  totalLengthM: number;
  nodeRefs: string[];
  steps: RouteStep[];
  geometry: StoredLineStringGeometry;
  found: boolean;
};

export type ReachableFromInput = {
  mapId: number;
  fromRef: string;
};

export type ReachableFromResult = {
  fromRef: string;
  reachableNodeRefs: string[];
  reachableSegmentIds: number[];
};
