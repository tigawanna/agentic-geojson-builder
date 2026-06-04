import { ReferenceInspectTooltipBody } from "@renderer/features/maps/components/ReferenceInspectTooltipBody";
import {
  featureDetailLines,
  featureDisplayName,
  partitionMapboxFeatures,
  pickPrimaryFeature,
} from "@renderer/features/maps/lib/mapbox-feature-utils";
import {
  formatProbeCoordinatesLatLng,
  type MapboxProbeCoordinates,
} from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import type { ReferenceInspectHover } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import { useTranslation } from "react-i18next";

type MapInspectCombinedHoverTooltipProps = {
  coordinates: MapboxProbeCoordinates;
  features: MapboxGeoJSONFeature[];
  referenceHover: ReferenceInspectHover | null;
  clientX: number;
  clientY: number;
};

export function MapInspectCombinedHoverTooltip({
  coordinates,
  features,
  referenceHover,
  clientX,
  clientY,
}: MapInspectCombinedHoverTooltipProps) {
  const { t } = useTranslation();
  const { basemap, workspace } = partitionMapboxFeatures(features);
  const primary = pickPrimaryFeature(features);
  const details = primary ? featureDetailLines(primary) : [];
  const offset = 14;
  const coordLine = formatProbeCoordinatesLatLng(coordinates);
  const elevLine =
    coordinates.elevationMeters === null ? null : `${coordinates.elevationMeters.toFixed(1)} m`;
  const basemapExtra = basemap.length > 1 ? basemap.length - 1 : 0;
  const workspaceExtra = workspace.length;

  return (
    <div
      data-test="map-inspect-combined-hover-tooltip"
      className="pointer-events-none fixed z-50 max-w-[20rem] rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
      style={{
        left: clientX + offset,
        top: clientY + offset,
      }}
    >
      {referenceHover ? (
        <div data-test="map-inspect-reference-section">
          <p className="text-[10px] font-semibold tracking-wide text-base-content/45 uppercase">
            {t("mapboxViewer.inspectReferenceTrail")}
          </p>
          <div className="mt-1">
            <ReferenceInspectTooltipBody
              hover={referenceHover}
              elevationMeters={coordinates.elevationMeters}
            />
          </div>
        </div>
      ) : null}
      {referenceHover ? <div className="my-2 border-t border-base-300/80" /> : null}
      <div data-test="map-inspect-basemap-section">
        {primary ? <p className="font-semibold">{featureDisplayName(primary)}</p> : null}
        <p className={`font-mono text-xs text-base-content/70 ${primary ? "mt-1" : ""}`}>
          {coordLine}
          {elevLine ? ` · ${elevLine}` : ""}
        </p>
        {details.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs text-base-content/60">
            {details.map((line) => (
              <li key={line} className="truncate">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {basemapExtra > 0 ? (
          <p className="mt-1 text-[10px] text-base-content/45">
            {t("mapboxViewer.inspectMoreBasemap", { count: basemapExtra })}
          </p>
        ) : null}
        {workspaceExtra > 0 ? (
          <p className="mt-1 text-[10px] text-base-content/45">
            {t("mapboxViewer.inspectWorkspaceOverlayCount", { count: workspaceExtra })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
