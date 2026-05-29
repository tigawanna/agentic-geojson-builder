import { formatElevation } from "@renderer/features/map-playground/lib/analyze-trail-feature";
import {
  ELEVATION_GRADIENT_STOPS,
  type ElevationRange,
} from "@renderer/features/map-playground/lib/elevation-colors";
import { useTranslation } from "react-i18next";

type PlaygroundElevationLegendProps = {
  range: ElevationRange;
};

export function PlaygroundElevationLegend({ range }: PlaygroundElevationLegendProps) {
  const { t } = useTranslation();

  return (
    <div
      data-test="playground-elevation-legend"
      className="pointer-events-none absolute right-4 bottom-4 z-10 w-44 rounded-2xl border border-base-300 bg-base-100/95 p-3 shadow-xl backdrop-blur-sm"
    >
      <p className="text-xs font-semibold tracking-wide text-base-content/70 uppercase">
        {t("home.playground.elevationLegend")}
      </p>
      <div
        className="mt-2 h-3 w-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${ELEVATION_GRADIENT_STOPS.join(", ")})`,
        }}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium">
        <span className="text-success">{formatElevation(range.min)}</span>
        <span className="text-base-content/50">{t("home.playground.elevationLegendMid")}</span>
        <span className="text-error">{formatElevation(range.max)}</span>
      </div>
      <p className="mt-1 text-[10px] text-base-content/55">
        {t("home.playground.elevationLegendHint")}
      </p>
    </div>
  );
}
