import { formatElevation } from "@renderer/features/map-playground/lib/analyze-trail-feature";
import { ELEVATION_GRADIENT_STOPS } from "@renderer/features/map-playground/lib/elevation-colors";
import type { ElevationProfileSummary } from "@renderer/features/maps/lib/elevation-profile";
import { useTranslation } from "react-i18next";

type MapDataExplorerElevationChartProps = {
  profile: ElevationProfileSummary;
};

export function MapDataExplorerElevationChart({ profile }: MapDataExplorerElevationChartProps) {
  const { t } = useTranslation();
  const width = 240;
  const height = 72;
  const padding = 4;
  const span = profile.maxM - profile.minM || 1;
  const maxDistance = profile.points[profile.points.length - 1]?.distanceM ?? 1;

  const polyline = profile.points
    .map((point) => {
      const x = padding + (point.distanceM / maxDistance) * (width - padding * 2);
      const y =
        height - padding - ((point.elevationM - profile.minM) / span) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100/60 p-3">
      <p className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {t("maps.workspace.dataExplorer.elevationProfile")}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-20 w-full text-primary"
        role="img"
        aria-label={t("maps.workspace.dataExplorer.elevationProfile")}
      >
        <defs>
          <linearGradient id="data-explorer-elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="mt-2 h-2 w-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${ELEVATION_GRADIENT_STOPS.join(", ")})`,
        }}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium tabular-nums">
        <span className="text-success">{formatElevation(profile.minM)}</span>
        <span className="text-base-content/50">
          {t("maps.workspace.dataExplorer.elevationLowHigh")}
        </span>
        <span className="text-error">{formatElevation(profile.maxM)}</span>
      </div>
    </div>
  );
}
