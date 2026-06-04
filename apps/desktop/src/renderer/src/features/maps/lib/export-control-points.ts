import type { ControlPointRecord } from "@shared/control-points.types";

export type ControlPointsExportFormat = "json" | "csv" | "geojson";

type ControlPointGeoJsonFeature = {
  type: "Feature";
  id: number;
  geometry: {
    type: "Point";
    coordinates: [number, number] | [number, number, number];
  };
  properties: {
    id: number;
    mapId: number;
    label: string | null;
    poleNumber: string | null;
    description: string | null;
    imageX: number;
    imageY: number;
    altitudeM: number | null;
    sourceSegmentId: number | null;
    createdAt: string;
    metadata: ControlPointRecord["metadata"];
  };
};

export type ControlPointsGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: ControlPointGeoJsonFeature[];
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

export function controlPointsToGeoJson(
  controlPoints: ControlPointRecord[],
): ControlPointsGeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: controlPoints.map((point) => ({
      type: "Feature",
      id: point.id,
      geometry: {
        type: "Point",
        coordinates:
          point.altitudeM !== null
            ? [point.longitude, point.latitude, point.altitudeM]
            : [point.longitude, point.latitude],
      },
      properties: {
        id: point.id,
        mapId: point.mapId,
        label: point.label,
        poleNumber: point.poleNumber,
        description: point.description,
        imageX: point.imageX,
        imageY: point.imageY,
        altitudeM: point.altitudeM,
        sourceSegmentId: point.sourceSegmentId,
        createdAt: point.createdAt,
        metadata: point.metadata,
      },
    })),
  };
}

export function serializeControlPointsGeoJson(controlPoints: ControlPointRecord[]): string {
  return JSON.stringify(controlPointsToGeoJson(controlPoints), null, 2);
}

export function serializeControlPointsJson(controlPoints: ControlPointRecord[]): string {
  return JSON.stringify(controlPoints, null, 2);
}

export function serializeControlPointsCsv(controlPoints: ControlPointRecord[]): string {
  const headers = [
    "id",
    "label",
    "poleNumber",
    "description",
    "latitude",
    "longitude",
    "altitudeM",
    "imageX",
    "imageY",
    "sourceSegmentId",
    "createdAt",
  ];
  const rows = controlPoints.map((point) =>
    [
      point.id,
      point.label,
      point.poleNumber,
      point.description,
      point.latitude,
      point.longitude,
      point.altitudeM,
      point.imageX,
      point.imageY,
      point.sourceSegmentId,
      point.createdAt,
    ]
      .map(formatCsvCell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportControlPointsFile(
  controlPoints: ControlPointRecord[],
  mapId: number,
  format: ControlPointsExportFormat,
): void {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    downloadTextFile(
      `control-points-${mapId}-${stamp}.json`,
      serializeControlPointsJson(controlPoints),
      "application/json",
    );
    return;
  }
  if (format === "geojson") {
    downloadTextFile(
      `control-points-${mapId}-${stamp}.geojson`,
      serializeControlPointsGeoJson(controlPoints),
      "application/geo+json",
    );
    return;
  }
  downloadTextFile(
    `control-points-${mapId}-${stamp}.csv`,
    serializeControlPointsCsv(controlPoints),
    "text/csv",
  );
}
