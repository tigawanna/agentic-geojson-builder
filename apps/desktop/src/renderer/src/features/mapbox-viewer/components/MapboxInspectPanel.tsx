import { MapboxProbeCoordinatesSection } from "@renderer/features/mapbox-viewer/components/MapboxProbeCoordinatesSection";
import { featureDisplayName } from "@renderer/features/mapbox-viewer/lib/mapbox-feature-utils";
import type { MapboxProbeCoordinates } from "@renderer/features/mapbox-viewer/lib/mapbox-probe-coordinates";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type MapboxInspectPanelProps = {
  coordinates: MapboxProbeCoordinates;
  features: MapboxGeoJSONFeature[];
  pinned: boolean;
  onClose: () => void;
  onCapture: () => void;
  capturePending: boolean;
};

export function MapboxInspectPanel({
  coordinates,
  features,
  pinned,
  onClose,
  onCapture,
  capturePending,
}: MapboxInspectPanelProps) {
  const { t } = useTranslation();
  const labeled = features.slice(0, 12);

  return (
    <div
      data-test="mapbox-inspect-panel"
      className="pointer-events-auto absolute right-3 bottom-3 z-10 flex max-h-[min(28rem,55vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2 border-b border-base-300 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{t("mapboxViewer.inspectTitle")}</p>
          <p className="text-xs text-base-content/60">
            {pinned ? t("mapboxViewer.inspectPinned") : t("mapboxViewer.inspectHover")}
            {features.length > 0
              ? ` · ${t("mapboxViewer.inspectCount", { count: features.length })}`
              : ` · ${t("mapboxViewer.inspectNoFeatures")}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-circle btn-ghost btn-xs"
          onClick={onClose}
          aria-label={t("mapboxViewer.inspectClose")}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <MapboxProbeCoordinatesSection coordinates={coordinates} />

      <div className="flex flex-wrap gap-1.5 border-b border-base-300 px-4 py-3">
        <button
          type="button"
          className="btn btn-xs btn-primary"
          disabled={capturePending}
          onClick={onCapture}
        >
          {t("mapboxViewer.addToCollection")}
        </button>
        <p className="w-full text-[11px] text-base-content/50">{t("mapboxViewer.captureHint")}</p>
      </div>

      {labeled.length > 0 ? (
        <ul className="overflow-y-auto p-2">
          {labeled.map((feature, index) => (
            <li
              key={`${feature.layer?.id ?? "layer"}-${index}`}
              className="rounded-lg px-2 py-2 text-sm hover:bg-base-200/80"
            >
              <p className="font-medium">{featureDisplayName(feature)}</p>
              <p className="text-xs text-base-content/55">
                {feature.layer?.id}
                {feature.sourceLayer ? ` · ${feature.sourceLayer}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
