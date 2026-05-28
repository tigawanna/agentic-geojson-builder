import type { TileCacheCoverage } from "./rendered-map-view.types.js";
import type { ControlPointRecord } from "./control-points.types.js";

export type PlacementQualityHints = {
  warnings: string[];
  suggestions: string[];
};

export function buildPlacementQualityHints(
  coverage: TileCacheCoverage,
  controlPoints: ControlPointRecord[],
): PlacementQualityHints {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (coverage.hasTileCache && !coverage.viewportFullyCovered) {
    warnings.push(
      `Map viewport is only ${coverage.overlapPercent}% inside the tile cache; grey tiles may mislead placement. Call set_map_viewport inside cache bounds and recapture.`,
    );
  }

  if (!coverage.hasTileCache) {
    warnings.push(
      "No tile cache configured; map pane may load remote tiles slowly or fail offline.",
    );
  }

  const count = controlPoints.length;
  if (count === 0) {
    suggestions.push(
      "Place at least 3 reference points spread across the map (triangle: NW, SE, and center). Prefer trail intersections and named gates.",
    );
  } else if (count < 3) {
    suggestions.push(
      `${count} point(s) placed; add ${3 - count} more, spread apart—not clustered near existing points.`,
    );
  }

  if (count >= 2) {
    const spreadKm = estimateSpreadKm(controlPoints);
    if (spreadKm < 0.5) {
      warnings.push(
        `Control points span only ~${spreadKm.toFixed(2)} km; spread them wider for better georeferencing.`,
      );
    }
  }

  suggestions.push(
    "Use zoom 15–16, verify with map_pane_pixel_to_lon_lat before create, and recapture after placing to check markers.",
  );

  return { warnings, suggestions };
}

function estimateSpreadKm(points: ControlPointRecord[]): number {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((midLat * Math.PI) / 180);
  return Math.max(latSpan * kmPerDegLat, lngSpan * kmPerDegLng);
}
