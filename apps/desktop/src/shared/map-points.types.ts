export type MapPointMetadata = Record<string, string>;

export type MapPointCategory =
  | "junction"
  | "gate"
  | "viewpoint"
  | "water"
  | "cave"
  | "rest_area"
  | "sign"
  | "custom";

export const MAP_POINT_CATEGORIES: MapPointCategory[] = [
  "junction",
  "gate",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "custom",
];

export const ROUTING_POINT_CATEGORIES: MapPointCategory[] = ["junction", "gate"];

export type MapPointNodeRole = "junction" | "endpoint" | "waypoint";

export const MAP_POINT_NODE_ROLES: MapPointNodeRole[] = ["junction", "endpoint", "waypoint"];

export type MapPointElevationSource = "manual" | "inferred_from_path";

export type MapPointRecord = {
  id: number;
  mapId: number;
  ref: string | null;
  name: string | null;
  category: MapPointCategory;
  nodeRole: MapPointNodeRole | null;
  longitude: number;
  latitude: number;
  elevation: number | null;
  elevationSource: MapPointElevationSource | null;
  description: string | null;
  parentRef: string | null;
  sortOrder: number;
  imageX: number | null;
  imageY: number | null;
  metadata: MapPointMetadata;
  createdAt: string;
  updatedAt: string;
};

export type CreateMapPointInput = {
  mapId: number;
  longitude: number;
  latitude: number;
  ref?: string | null;
  name?: string | null;
  category?: MapPointCategory;
  nodeRole?: MapPointNodeRole | null;
  elevation?: number | null;
  elevationSource?: MapPointElevationSource | null;
  description?: string | null;
  parentRef?: string | null;
  sortOrder?: number;
  imageX?: number | null;
  imageY?: number | null;
  metadata?: MapPointMetadata;
};

export type UpdateMapPointInput = {
  mapId: number;
  pointId: number;
  longitude?: number;
  latitude?: number;
  ref?: string | null;
  name?: string | null;
  category?: MapPointCategory;
  nodeRole?: MapPointNodeRole | null;
  elevation?: number | null;
  elevationSource?: MapPointElevationSource | null;
  description?: string | null;
  parentRef?: string | null;
  sortOrder?: number;
  imageX?: number | null;
  imageY?: number | null;
  metadata?: MapPointMetadata;
};

export type DeleteMapPointInput = {
  mapId: number;
  pointId: number;
};

export type MapPointsChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted";
  pointId?: number;
};
