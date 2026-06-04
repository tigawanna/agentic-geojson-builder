import type {
  CreateMapPointInput,
  MapPointCategory,
  MapPointRecord,
} from "@shared/map-points.types";
import { MAP_POINT_CATEGORIES } from "@shared/map-points.types";
import type { MapPointsGeoJsonFeatureCollection } from "@renderer/features/maps/lib/export-map-points";

function isMapPointCategory(value: unknown): value is MapPointCategory {
  return typeof value === "string" && MAP_POINT_CATEGORIES.includes(value as MapPointCategory);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function recordToCreateInput(
  mapId: number,
  raw: Record<string, unknown>,
): CreateMapPointInput | null {
  const latitude = readNumber(raw.latitude);
  const longitude = readNumber(raw.longitude);
  if (latitude === null || longitude === null) {
    return null;
  }

  const category = isMapPointCategory(raw.category) ? raw.category : "custom";

  return {
    mapId,
    latitude,
    longitude,
    ref: readString(raw.ref),
    name: readString(raw.name),
    category,
    elevation: readNumber(raw.elevation),
    elevationSource:
      raw.elevationSource === "manual" || raw.elevationSource === "inferred_from_path"
        ? raw.elevationSource
        : null,
    description: readString(raw.description),
    parentRef: readString(raw.parentRef),
    sortOrder: readNumber(raw.sortOrder) ?? undefined,
    imageX: readNumber(raw.imageX),
    imageY: readNumber(raw.imageY),
    metadata:
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? (raw.metadata as MapPointRecord["metadata"])
        : undefined,
  };
}

function featureToCreateInput(
  mapId: number,
  feature: MapPointsGeoJsonFeatureCollection["features"][number],
): CreateMapPointInput | null {
  const coords = feature.geometry.coordinates;
  const longitude = coords[0];
  const latitude = coords[1];
  const elevation = coords.length > 2 ? coords[2] : null;
  const props = feature.properties;

  return {
    mapId,
    latitude,
    longitude,
    elevation: elevation ?? props.elevation ?? null,
    ref: props.ref,
    name: props.name,
    category: props.category,
    elevationSource: props.elevationSource,
    description: props.description,
    parentRef: props.parentRef,
    sortOrder: props.sortOrder,
    imageX: props.imageX,
    imageY: props.imageY,
    metadata: props.metadata,
  };
}

export function parseMapPointsImportJson(text: string, mapId: number): CreateMapPointInput[] {
  const parsed: unknown = JSON.parse(text);
  const inputs: CreateMapPointInput[] = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const input = recordToCreateInput(mapId, entry as Record<string, unknown>);
      if (input) {
        inputs.push(input);
      }
    }
    return inputs;
  }

  if (!parsed || typeof parsed !== "object") {
    return inputs;
  }

  const object = parsed as Record<string, unknown>;

  if (object.type === "FeatureCollection" && Array.isArray(object.features)) {
    for (const feature of object.features) {
      if (!feature || typeof feature !== "object") {
        continue;
      }
      const typed = feature as MapPointsGeoJsonFeatureCollection["features"][number];
      if (typed.geometry?.type !== "Point") {
        continue;
      }
      const input = featureToCreateInput(mapId, typed);
      if (input) {
        inputs.push(input);
      }
    }
    return inputs;
  }

  if (Array.isArray(object.points)) {
    for (const entry of object.points) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const input = recordToCreateInput(mapId, entry as Record<string, unknown>);
      if (input) {
        inputs.push(input);
      }
    }
  }

  return inputs;
}
