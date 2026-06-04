import { describe, expect, it } from "vitest";
import type { SegmentEdgeRecord } from "@shared/segments.types.js";
import { findRouteOnGraph } from "@main/lib/routing/route-graph.js";

function edge(id: number, fromRef: string, toRef: string, lengthM: number): SegmentEdgeRecord {
  return {
    id,
    mapId: 1,
    fromRef,
    toRef,
    pathSlug: "test",
    startFraction: 0,
    endFraction: 1,
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [lengthM / 111_000, 0],
      ],
    },
    lengthM,
    kind: "walking-trail",
    bidirectional: true,
    status: "accepted",
    metadata: {},
    createdAt: "",
    updatedAt: "",
  };
}

describe("findRouteOnGraph", () => {
  it("finds a path through chained segments", () => {
    const segments = [edge(1, "a", "b", 100), edge(2, "b", "c", 50)];

    const result = findRouteOnGraph(segments, "a", "c");

    expect(result.found).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.totalLengthM).toBe(150);
    expect(result.nodeRefs).toEqual(["a", "b", "c"]);
  });

  it("returns not found when graph is disconnected", () => {
    const segments = [edge(1, "a", "b", 100), edge(2, "c", "d", 50)];

    const result = findRouteOnGraph(segments, "a", "d");

    expect(result.found).toBe(false);
    expect(result.steps).toHaveLength(0);
  });

  it("routes through via markers", () => {
    const segments = [edge(1, "a", "b", 10), edge(2, "b", "c", 10), edge(3, "c", "d", 10)];

    const result = findRouteOnGraph(segments, "a", "d", ["b"]);

    expect(result.found).toBe(true);
    expect(result.viaRefs).toEqual(["b"]);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });
});
