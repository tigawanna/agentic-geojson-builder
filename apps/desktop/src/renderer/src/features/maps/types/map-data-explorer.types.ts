export type MapDataExplorerTab = "points" | "segments" | "links" | "trails" | "route" | "history";

export type MapDataExplorerSelection =
  | { kind: "control-point"; id: number }
  | { kind: "map-point"; id: number }
  | { kind: "segment"; id: number }
  | { kind: "path"; groupId: string }
  | { kind: "link"; id: number }
  | { kind: "trail"; id: number };

export type MapPathGroupSummary = {
  groupId: string;
  name: string | null;
  pathKind: string;
  segmentCount: number;
  pointCount: number;
  segmentIds: number[];
};
