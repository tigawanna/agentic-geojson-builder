import type { MapPointCategory, MapPointNodeRole, MapPointRecord } from "@shared/map-points.types";

export const MAP_POINT_TYPES = [
  "junction",
  "gate",
  "bridge",
  "endpoint",
  "waypoint",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "custom",
] as const;

export type MapPointType = (typeof MAP_POINT_TYPES)[number];

export function resolveMapPointType(input: {
  category: MapPointCategory;
  nodeRole: MapPointNodeRole | null;
}): MapPointType {
  if (input.nodeRole === "endpoint" || input.nodeRole === "waypoint") {
    return input.nodeRole;
  }
  if (input.nodeRole === "junction" || input.category === "junction" || input.category === "gate") {
    return input.category === "gate" ? "gate" : "junction";
  }
  return input.category;
}

export function resolveMapPointTypeFromRecord(point: MapPointRecord): MapPointType {
  return resolveMapPointType({ category: point.category, nodeRole: point.nodeRole });
}

export function mapPointTypeToFields(type: MapPointType): {
  category: MapPointCategory;
  nodeRole: MapPointNodeRole | null;
} {
  if (type === "junction") {
    return { category: "junction", nodeRole: null };
  }
  if (type === "gate") {
    return { category: "gate", nodeRole: null };
  }
  if (type === "endpoint" || type === "waypoint") {
    return { category: "custom", nodeRole: type };
  }
  return { category: type, nodeRole: null };
}
