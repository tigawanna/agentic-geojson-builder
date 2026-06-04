import { MapboxProbeCoordinatesSection } from "@renderer/features/maps/components/MapboxProbeCoordinatesSection";
import { ReferenceInspectTooltipBody } from "@renderer/features/maps/components/ReferenceInspectTooltipBody";
import {
  featureDisplayName,
  partitionMapboxFeatures,
} from "@renderer/features/maps/lib/mapbox-feature-utils";
import type { MapboxProbeCoordinates } from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import type { ReferenceInspectHover } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type MapboxInspectPanelProps = {
  coordinates: MapboxProbeCoordinates;
  features: MapboxGeoJSONFeature[];
  referenceHover: ReferenceInspectHover | null;
  pinned: boolean;
  onClose: () => void;
  onCapture: () => void;
  capturePending: boolean;
};

function FeatureList({ features }: { features: MapboxGeoJSONFeature[] }) {
  const labeled = features.slice(0, 12);

  if (labeled.length === 0) {
    return null;
  }

  return (
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
  );
}

export function MapboxInspectPanel({
  coordinates,
  features,
  referenceHover,
  pinned,
  onClose,
  onCapture,
  capturePending,
}: MapboxInspectPanelProps) {
  const { t } = useTranslation();
  const { basemap, workspace } = partitionMapboxFeatures(features);
  const featureCount = basemap.length > 0 ? basemap.length : features.length;

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
            {featureCount > 0
              ? ` · ${t("mapboxViewer.inspectCount", { count: featureCount })}`
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

      {referenceHover ? (
        <div className="border-b border-base-300 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wide text-base-content/45 uppercase">
            {t("mapboxViewer.inspectReferenceTrail")}
          </p>
          <div className="mt-2">
            <ReferenceInspectTooltipBody
              hover={referenceHover}
              elevationMeters={coordinates.elevationMeters}
            />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {basemap.length > 0 ? (
          <div>
            <p className="px-4 pt-2 text-[10px] font-semibold tracking-wide text-base-content/45 uppercase">
              {t("mapboxViewer.inspectBasemapFeatures")}
            </p>
            <FeatureList features={basemap} />
          </div>
        ) : null}
        {workspace.length > 0 ? (
          <div>
            <p className="px-4 pt-2 text-[10px] font-semibold tracking-wide text-base-content/45 uppercase">
              {t("mapboxViewer.inspectWorkspaceOverlays")}
            </p>
            <FeatureList features={workspace} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
