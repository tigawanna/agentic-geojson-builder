export type MapPointLinkRefSource = {
  id: number;
  ref: string | null;
  name: string | null;
};

export function resolveMapPointLinkRef(point: MapPointLinkRefSource): string {
  const ref = point.ref?.trim();
  if (ref) {
    return ref;
  }
  const name = point.name?.trim();
  if (name) {
    return name;
  }
  return `m${point.id}`;
}

export const MAP_POINT_NEIGHBOR_METADATA_KEYS = {
  left: "neighborLeft",
  right: "neighborRight",
  ahead: "neighborAhead",
} as const;

export function readMapPointNeighborHints(metadata: Record<string, string> | undefined): {
  left: string;
  right: string;
  ahead: string;
} {
  const data = metadata ?? {};
  return {
    left: data[MAP_POINT_NEIGHBOR_METADATA_KEYS.left] ?? "",
    right: data[MAP_POINT_NEIGHBOR_METADATA_KEYS.right] ?? "",
    ahead: data[MAP_POINT_NEIGHBOR_METADATA_KEYS.ahead] ?? "",
  };
}
