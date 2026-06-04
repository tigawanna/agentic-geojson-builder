import { describe, expect, it } from "vitest";
import { buildSegmentProposalsFromPath } from "@main/lib/geojson/segmentation.js";

const path: [number, number][] = [
  [36.8, -1.24],
  [36.801, -1.24],
  [36.802, -1.241],
  [36.803, -1.242],
];

describe("buildSegmentProposalsFromPath", () => {
  it("creates one segment between two junction markers on a straight path", () => {
    const { proposed, skipped } = buildSegmentProposalsFromPath(path, [
      {
        ref: "a",
        longitude: 36.8,
        latitude: -1.24,
        nodeRole: "junction",
        category: "junction",
      },
      {
        ref: "b",
        longitude: 36.803,
        latitude: -1.242,
        nodeRole: "endpoint",
        category: "gate",
      },
    ]);

    expect(skipped).toHaveLength(0);
    expect(proposed).toHaveLength(1);
    expect(proposed[0]?.fromRef).toBe("a");
    expect(proposed[0]?.toRef).toBe("b");
    expect(proposed[0]?.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(proposed[0]?.lengthM).toBeGreaterThan(0);
  });

  it("splits into multiple segments at intermediate junctions", () => {
    const { proposed } = buildSegmentProposalsFromPath(path, [
      {
        ref: "a",
        longitude: 36.8,
        latitude: -1.24,
        nodeRole: "junction",
        category: "junction",
      },
      {
        ref: "mid",
        longitude: 36.801,
        latitude: -1.24,
        nodeRole: "junction",
        category: "junction",
      },
      {
        ref: "c",
        longitude: 36.803,
        latitude: -1.242,
        nodeRole: "endpoint",
        category: "gate",
      },
    ]);

    expect(proposed).toHaveLength(2);
    expect(proposed[0]?.toRef).toBe("mid");
    expect(proposed[1]?.fromRef).toBe("mid");
  });

  it("skips markers that are not routing nodes", () => {
    const { proposed, skipped } = buildSegmentProposalsFromPath(path, [
      {
        ref: "a",
        longitude: 36.8,
        latitude: -1.24,
        nodeRole: "waypoint",
        category: "custom",
      },
      {
        ref: "b",
        longitude: 36.803,
        latitude: -1.242,
        nodeRole: null,
        category: "junction",
      },
    ]);

    expect(proposed).toHaveLength(0);
    expect(skipped.some((entry: { ref: string }) => entry.ref === "a")).toBe(true);
  });
});
