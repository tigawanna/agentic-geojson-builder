import type { MapPointRecord } from "@shared/map-points.types";
import { downloadTextFile } from "@renderer/features/maps/lib/export-control-points";

export type MapPointsExportFormat = "json" | "csv" | "geojson";

type MapPointGeoJsonFeature = {
  type: "Feature";
  id: number;
  geometry: {
    type: "Point";
    coordinates: [number, number] | [number, number, number];
  };
  properties: {
    id: number;
    mapId: number;
    ref: string | null;
    name: string | null;
    category: MapPointRecord["category"];
    elevation: number | null;
    elevationSource: MapPointRecord["elevationSource"];
    description: string | null;
    parentRef: string | null;
    sortOrder: number;
    imageX: number | null;
    imageY: number | null;
    metadata: MapPointRecord["metadata"];
    createdAt: string;
    updatedAt: string;
  };
};

export type MapPointsGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: MapPointGeoJsonFeature[];
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return escapeCsvCell(String(value));
}

export function mapPointsToGeoJson(mapPoints: MapPointRecord[]): MapPointsGeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: mapPoints.map((point) => ({
      type: "Feature",
      id: point.id,
      geometry: {
        type: "Point",
        coordinates:
          point.elevation !== null
            ? [point.longitude, point.latitude, point.elevation]
            : [point.longitude, point.latitude],
      },
      properties: {
        id: point.id,
        mapId: point.mapId,
        ref: point.ref,
        name: point.name,
        category: point.category,
        elevation: point.elevation,
        elevationSource: point.elevationSource,
        description: point.description,
        parentRef: point.parentRef,
        sortOrder: point.sortOrder,
        imageX: point.imageX,
        imageY: point.imageY,
        metadata: point.metadata,
        createdAt: point.createdAt,
        updatedAt: point.updatedAt,
      },
    })),
  };
}

export function serializeMapPointsGeoJson(mapPoints: MapPointRecord[]): string {
  return JSON.stringify(mapPointsToGeoJson(mapPoints), null, 2);
}

export function serializeMapPointsJson(mapPoints: MapPointRecord[]): string {
  return JSON.stringify(mapPoints, null, 2);
}

export function serializeMapPointsCsv(mapPoints: MapPointRecord[]): string {
  const headers = [
    "id",
    "ref",
    "name",
    "category",
    "latitude",
    "longitude",
    "elevation",
    "description",
    "parentRef",
    "imageX",
    "imageY",
    "sortOrder",
    "createdAt",
  ];
  const rows = mapPoints.map((point) =>
    [
      point.id,
      point.ref,
      point.name,
      point.category,
      point.latitude,
      point.longitude,
      point.elevation,
      point.description,
      point.parentRef,
      point.imageX,
      point.imageY,
      point.sortOrder,
      point.createdAt,
    ]
      .map(formatCsvCell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportMapPointsFile(
  mapPoints: MapPointRecord[],
  mapId: number,
  format: MapPointsExportFormat,
): void {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    downloadTextFile(
      `map-markers-${mapId}-${stamp}.json`,
      serializeMapPointsJson(mapPoints),
      "application/json",
    );
    return;
  }
  if (format === "geojson") {
    downloadTextFile(
      `map-markers-${mapId}-${stamp}.geojson`,
      serializeMapPointsGeoJson(mapPoints),
      "application/geo+json",
    );
    return;
  }
  downloadTextFile(
    `map-markers-${mapId}-${stamp}.csv`,
    serializeMapPointsCsv(mapPoints),
    "text/csv",
  );
}
