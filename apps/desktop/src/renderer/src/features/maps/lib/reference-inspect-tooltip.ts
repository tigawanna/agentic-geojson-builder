import { getElevationAtLatLng } from "@repo/isomorphic/elevation-at-point";
import type { NearestLinePointResult } from "@repo/isomorphic/nearest-line-point";

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

export type ReferenceInspectHover = {
  cursorLatitude: number;
  cursorLongitude: number;
  nearest: NearestLinePointResult;
};

export function buildReferenceInspectTooltipContent(hover: ReferenceInspectHover): string {
  const { cursorLatitude, cursorLongitude, nearest } = hover;
  const trailElevation = getElevationAtLatLng(
    nearest.coordinates,
    nearest.latitude,
    nearest.longitude,
  );
  const elevationLabel = formatElevation(trailElevation);
  const title = escapeHtml(nearest.lineName);

  const rows = [
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Cursor</span><span class="reference-inspect-tooltip-value">${formatCoord(cursorLatitude)}, ${formatCoord(cursorLongitude)}</span></div>`,
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">On trail</span><span class="reference-inspect-tooltip-value">${formatCoord(nearest.latitude)}, ${formatCoord(nearest.longitude)}</span></div>`,
    `<div class="reference-inspect-tooltip-row"><span class="reference-inspect-tooltip-label">Offset</span><span class="reference-inspect-tooltip-value">${escapeHtml(formatDistanceMeters(nearest.distanceMeters))}</span></div>`,
  ];

  if (elevationLabel) {
    rows.push(
      `<div class="reference-inspect-tooltip-elevation">${escapeHtml(elevationLabel)} <span class="reference-inspect-tooltip-elevation-hint">on trail</span></div>`,
    );
  }

  return `<div class="reference-inspect-tooltip-title">${title}</div>${rows.join("")}`;
}
