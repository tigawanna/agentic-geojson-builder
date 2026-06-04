import type { NearestLinePointResult } from "@repo/isomorphic/nearest-line-point";
import {
  resolveInspectElevationMeters,
  toNearbyElevationPointsFromControlPoints,
  toNearbyElevationPointsFromMapPoints,
} from "@renderer/features/maps/lib/resolve-inspect-elevation";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatCoord(value: number) {
  return value.toFixed(6);
}

function formatElevation(meters: number | null) {
  if (meters === null) {
    return null;
  }
  return `${Math.round(meters)} m`;
}

function formatDistanceMeters(meters: number) {
  if (meters < 1) {
    return `${(meters * 100).toFixed(0)} cm`;
  }
  return `${meters.toFixed(1)} m`;
}

export const REFERENCE_INSPECT_MAX_DISTANCE_METERS = 100;

export type ReferenceInspectHover = {
  cursorLatitude: number;
  cursorLongitude: number;
  nearest: NearestLinePointResult;
};

export type ReferenceInspectCopyTarget = {
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
};

export type BuildReferenceInspectCopyTargetOptions = {
  hover: ReferenceInspectHover;
  controlPoints?: Array<{ latitude: number; longitude: number; altitudeM: number | null }>;
  mapPoints?: Array<{ latitude: number; longitude: number; elevation: number | null }>;
  terrainElevationMeters?: number | null;
};

export function buildReferenceInspectCopyTarget(
  hover: ReferenceInspectHover,
  context?: Omit<BuildReferenceInspectCopyTargetOptions, "hover">,
): ReferenceInspectCopyTarget {
  return {
    latitude: hover.nearest.latitude,
    longitude: hover.nearest.longitude,
    elevationMeters: resolveInspectElevationMeters({
      latitude: hover.nearest.latitude,
      longitude: hover.nearest.longitude,
      referenceHover: hover,
      terrainElevationMeters: context?.terrainElevationMeters ?? null,
      controlPoints: toNearbyElevationPointsFromControlPoints(context?.controlPoints ?? []),
      mapPoints: toNearbyElevationPointsFromMapPoints(context?.mapPoints ?? []),
    }),
  };
}

export function formatReferenceInspectCopyText(target: ReferenceInspectCopyTarget): string {
  const latitude = target.latitude.toFixed(6);
  const longitude = target.longitude.toFixed(6);
  if (target.elevationMeters === null) {
    return `${latitude}, ${longitude}`;
  }
  return `${latitude}, ${longitude}, ${target.elevationMeters.toFixed(1)}`;
}

export function buildReferenceInspectTooltipContent(hover: ReferenceInspectHover): string {
  const { nearest } = hover;
  const trailElevation = buildReferenceInspectCopyTarget(hover).elevationMeters;
  const elevationLabel = formatElevation(trailElevation);
  const title = escapeHtml(nearest.lineName);

  const rows = [
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Lat</span><span class="reference-inspect-tooltip-value">${formatCoord(nearest.latitude)}</span></div>`,
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Lng</span><span class="reference-inspect-tooltip-value">${formatCoord(nearest.longitude)}</span></div>`,
  ];

  if (elevationLabel) {
    rows.push(
      `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Alt</span><span class="reference-inspect-tooltip-value">${escapeHtml(elevationLabel)}</span></div>`,
    );
  }

  rows.push(
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Offset</span><span class="reference-inspect-tooltip-value">${escapeHtml(formatDistanceMeters(nearest.distanceMeters))}</span></div>`,
  );

  return `<div class="reference-inspect-tooltip-title">${title}</div>${rows.join("")}`;
}
