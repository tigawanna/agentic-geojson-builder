import type { MapboxGeoJSONFeature } from "mapbox-gl";

export const WORKSPACE_MAP_LAYER_PREFIX = "workspace-";

export function isWorkspaceMapLayerId(layerId: string | undefined): boolean {
  return layerId?.startsWith(WORKSPACE_MAP_LAYER_PREFIX) === true;
}

export function partitionMapboxFeatures(features: MapboxGeoJSONFeature[]): {
  basemap: MapboxGeoJSONFeature[];
  workspace: MapboxGeoJSONFeature[];
} {
  const basemap: MapboxGeoJSONFeature[] = [];
  const workspace: MapboxGeoJSONFeature[] = [];
  for (const feature of features) {
    if (isWorkspaceMapLayerId(feature.layer?.id)) {
      workspace.push(feature);
    } else {
      basemap.push(feature);
    }
  }
  return { basemap, workspace };
}

const LABEL_PROPERTY_KEYS = [
  "name",
  "ref",
  "text",
  "class",
  "type",
  "maki",
  "network",
  "shield",
] as const;

export function featureDisplayName(feature: MapboxGeoJSONFeature): string {
  const properties = feature.properties;
  if (!properties) {
    return feature.layer?.id ?? feature.sourceLayer ?? "Feature";
  }

  for (const key of LABEL_PROPERTY_KEYS) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return feature.layer?.id ?? feature.sourceLayer ?? "Feature";
}

export function featureDetailLines(feature: MapboxGeoJSONFeature): string[] {
  const lines: string[] = [];
  const layerId = feature.layer?.id;
  if (layerId) {
    lines.push(layerId);
  }
  if (feature.sourceLayer) {
    lines.push(feature.sourceLayer);
  }

  const properties = feature.properties;
  if (!properties) {
    return lines;
  }

  for (const key of LABEL_PROPERTY_KEYS) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      lines.push(`${key}: ${value.trim()}`);
    }
  }

  return [...new Set(lines)].slice(0, 4);
}

export function extractFeatureTags(feature: MapboxGeoJSONFeature | null): Record<string, string> {
  if (!feature?.properties) {
    return {};
  }

  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(feature.properties)) {
    if (typeof value === "string" && value.trim().length > 0) {
      tags[key] = value.trim();
    } else if (typeof value === "number" || typeof value === "boolean") {
      tags[key] = String(value);
    }
  }
  return tags;
}

export function pickPrimaryFeature(features: MapboxGeoJSONFeature[]): MapboxGeoJSONFeature | null {
  const { basemap } = partitionMapboxFeatures(features);
  const candidates = basemap.length > 0 ? basemap : features;
  if (candidates.length === 0) {
    return null;
  }

  const symbolOrLabel = candidates.find((feature) => {
    const type = feature.layer?.type;
    return type === "symbol" || type === "circle";
  });

  return symbolOrLabel ?? candidates[0] ?? null;
}
