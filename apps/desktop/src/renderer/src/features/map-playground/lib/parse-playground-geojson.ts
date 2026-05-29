import type {
  PlaygroundCoordinate,
  PlaygroundFeature,
  PlaygroundFeatureCollection,
  PlaygroundLineString,
} from "@renderer/types/map-playground.types";

const MAX_PLAYGROUND_GEOJSON_BYTES = 12 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCoordinate(value: unknown): value is PlaygroundCoordinate {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  const [longitude, latitude, elevation] = value;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return false;
  }

  if (value.length === 2) {
    return true;
  }

  return Number.isFinite(elevation);
}

function isLineStringCoordinates(value: unknown): value is PlaygroundCoordinate[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((coordinate) => isCoordinate(coordinate))
  );
}

function featureLabel(properties: Record<string, unknown>, fallback: string) {
  for (const key of ["name", "title", "label", "slug", "id"]) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return fallback;
}

function buildFeatureKey(
  layerName: string,
  featureIndex: number,
  properties: Record<string, unknown>,
) {
  if (typeof properties.slug === "string" && properties.slug.trim().length > 0) {
    return properties.slug.trim();
  }
  if (typeof properties.id === "string" && properties.id.trim().length > 0) {
    return `${layerName}:${properties.id.trim()}`;
  }
  if (typeof properties.id === "number" && Number.isFinite(properties.id)) {
    return `${layerName}:${properties.id}`;
  }
  return `${layerName}:${featureIndex}`;
}

function lineStringFeature(
  coordinates: PlaygroundCoordinate[],
  properties: Record<string, unknown>,
  fallbackLabel: string,
  featureKey: string,
  featureId?: string | number,
): PlaygroundFeature | null {
  if (!isLineStringCoordinates(coordinates)) {
    return null;
  }

  return {
    type: "Feature",
    id: featureId,
    properties: {
      ...properties,
      name: featureLabel(properties, fallbackLabel),
      playgroundFeatureKey: featureKey,
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function expandGeometryToFeatures(
  geometry: { type?: unknown; coordinates?: unknown },
  properties: Record<string, unknown>,
  fallbackLabel: string,
  layerName: string,
  featureIndexOffset: number,
): PlaygroundFeature[] {
  if (geometry.type === "LineString") {
    const featureKey = buildFeatureKey(layerName, featureIndexOffset, properties);
    const feature = lineStringFeature(
      geometry.coordinates as PlaygroundCoordinate[],
      properties,
      fallbackLabel,
      featureKey,
      typeof properties.id === "string" || typeof properties.id === "number"
        ? properties.id
        : featureKey,
    );
    return feature ? [feature] : [];
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((lineCoordinates, lineIndex) => {
      const featureIndex = featureIndexOffset + lineIndex;
      const nextProperties = {
        ...properties,
        multiLineIndex: lineIndex,
      };
      const featureKey = buildFeatureKey(layerName, featureIndex, nextProperties);
      const feature = lineStringFeature(
        lineCoordinates as PlaygroundCoordinate[],
        nextProperties,
        `${fallbackLabel} ${lineIndex + 1}`,
        featureKey,
        featureKey,
      );
      return feature ? [feature] : [];
    });
  }

  return [];
}

function expandUnknownFeature(
  value: unknown,
  featureIndex: number,
  layerName: string,
): PlaygroundFeature[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const feature = value as {
    type?: unknown;
    id?: unknown;
    properties?: unknown;
    geometry?: unknown;
  };

  if (feature.type !== "Feature" || !feature.geometry || typeof feature.geometry !== "object") {
    return [];
  }

  const properties = isRecord(feature.properties) ? feature.properties : {};
  const featureId =
    typeof feature.id === "string" || typeof feature.id === "number" ? feature.id : undefined;

  return expandGeometryToFeatures(
    feature.geometry as { type?: unknown; coordinates?: unknown },
    properties,
    `Feature ${featureIndex + 1}`,
    layerName,
    featureIndex,
  ).map((entry) => ({
    ...entry,
    id: entry.id ?? featureId,
  }));
}

export function parsePlaygroundGeoJsonCollection(
  value: unknown,
  layerName = "Imported layer",
): PlaygroundFeatureCollection {
  if (!value || typeof value !== "object") {
    throw new Error("GeoJSON must be a JSON object.");
  }

  const root = value as { type?: unknown; features?: unknown; geometry?: unknown };
  const features: PlaygroundFeature[] = [];

  if (root.type === "FeatureCollection" && Array.isArray(root.features)) {
    root.features.forEach((feature, index) => {
      features.push(...expandUnknownFeature(feature, index, layerName));
    });
  } else if (root.type === "Feature") {
    features.push(...expandUnknownFeature(root, 0, layerName));
  } else if (root.geometry && typeof root.geometry === "object") {
    features.push(
      ...expandGeometryToFeatures(
        root.geometry as { type?: unknown; coordinates?: unknown },
        {},
        "Geometry",
        layerName,
        0,
      ),
    );
  } else {
    throw new Error("GeoJSON must be a FeatureCollection, Feature, or geometry object.");
  }

  if (features.length === 0) {
    throw new Error("No LineString or MultiLineString geometries found in this GeoJSON.");
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function parsePlaygroundGeoJsonText(text: string, byteLength?: number, layerName?: string) {
  if (byteLength !== undefined && byteLength > MAX_PLAYGROUND_GEOJSON_BYTES) {
    throw new Error("GeoJSON file must be 12 MB or smaller.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("GeoJSON file is not valid JSON.");
  }

  return parsePlaygroundGeoJsonCollection(parsed, layerName);
}

export function readPlaygroundGeoJsonFile(file: File) {
  if (file.size > MAX_PLAYGROUND_GEOJSON_BYTES) {
    return Promise.reject(new Error("GeoJSON file must be 12 MB or smaller."));
  }

  const layerName = file.name.replace(/\.(geojson|json)$/i, "") || "Imported layer";
  return file.text().then((text) => parsePlaygroundGeoJsonText(text, file.size, layerName));
}

export function coordinatesToLatLngs(coordinates: PlaygroundLineString["coordinates"]) {
  return coordinates.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
}

export function getFeatureKey(feature: PlaygroundFeature) {
  const key = feature.properties.playgroundFeatureKey;
  if (typeof key === "string" && key.length > 0) {
    return key;
  }
  if (typeof feature.id === "string" || typeof feature.id === "number") {
    return String(feature.id);
  }
  return String(feature.properties.name);
}
