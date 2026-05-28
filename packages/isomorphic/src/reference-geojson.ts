export type ReferenceGeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type ReferenceGeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: ReferenceGeoJsonLineString;
};

export type ReferenceGeoJsonCollection = {
  type: "FeatureCollection";
  features: ReferenceGeoJsonFeature[];
};

const MAX_REFERENCE_GEOJSON_BYTES = 12 * 1024 * 1024;

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

function isLineStringCoordinates(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((coordinate) => isCoordinatePair(coordinate))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function featureLabel(properties: Record<string, unknown>, fallback: string) {
  for (const key of ["name", "title", "label", "id"]) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function lineStringFeature(
  coordinates: [number, number][],
  properties: Record<string, unknown>,
  fallbackLabel: string,
): ReferenceGeoJsonFeature | null {
  if (!isLineStringCoordinates(coordinates)) {
    return null;
  }

  return {
    type: "Feature",
    properties: {
      ...properties,
      name: featureLabel(properties, fallbackLabel),
      source: typeof properties.source === "string" ? properties.source : "geojson-reference",
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
): ReferenceGeoJsonFeature[] {
  if (geometry.type === "LineString") {
    const feature = lineStringFeature(
      geometry.coordinates as [number, number][],
      properties,
      fallbackLabel,
    );
    return feature ? [feature] : [];
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((lineCoordinates, lineIndex) => {
      const feature = lineStringFeature(
        lineCoordinates as [number, number][],
        {
          ...properties,
          multiLineIndex: lineIndex,
        },
        `${fallbackLabel} ${lineIndex + 1}`,
      );
      return feature ? [feature] : [];
    });
  }

  return [];
}

function expandUnknownFeature(value: unknown, featureIndex: number): ReferenceGeoJsonFeature[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const feature = value as {
    type?: unknown;
    properties?: unknown;
    geometry?: unknown;
  };

  if (feature.type !== "Feature" || !feature.geometry || typeof feature.geometry !== "object") {
    return [];
  }

  const properties = isRecord(feature.properties) ? feature.properties : {};
  return expandGeometryToFeatures(
    feature.geometry as { type?: unknown; coordinates?: unknown },
    properties,
    `Feature ${featureIndex + 1}`,
  );
}

export function parseReferenceGeoJsonCollection(value: unknown): ReferenceGeoJsonCollection {
  if (!value || typeof value !== "object") {
    throw new Error("GeoJSON must be a JSON object.");
  }

  const root = value as { type?: unknown; features?: unknown; geometry?: unknown };
  const features: ReferenceGeoJsonFeature[] = [];

  if (root.type === "FeatureCollection" && Array.isArray(root.features)) {
    root.features.forEach((feature, index) => {
      features.push(...expandUnknownFeature(feature, index));
    });
  } else if (root.type === "Feature") {
    features.push(...expandUnknownFeature(root, 0));
  } else if (root.geometry && typeof root.geometry === "object") {
    features.push(
      ...expandGeometryToFeatures(
        root.geometry as { type?: unknown; coordinates?: unknown },
        {},
        "Geometry",
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

export function parseReferenceGeoJsonText(
  text: string,
  byteLength?: number,
): ReferenceGeoJsonCollection {
  if (byteLength !== undefined && byteLength > MAX_REFERENCE_GEOJSON_BYTES) {
    throw new Error("GeoJSON file must be 12 MB or smaller.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("GeoJSON file is not valid JSON.");
  }

  return parseReferenceGeoJsonCollection(parsed);
}

export function mergeReferenceGeoJsonCollections(
  collections: ReferenceGeoJsonCollection[],
): ReferenceGeoJsonCollection {
  return {
    type: "FeatureCollection",
    features: collections.flatMap((collection) => collection.features),
  };
}
