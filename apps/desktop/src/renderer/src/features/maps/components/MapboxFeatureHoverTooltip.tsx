import {
  featureDetailLines,
  featureDisplayName,
  pickPrimaryFeature,
} from "@renderer/features/maps/lib/mapbox-feature-utils";
import {
  formatProbeCoordinatesLatLng,
  type MapboxProbeCoordinates,
} from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import type { MapboxGeoJSONFeature } from "mapbox-gl";

type MapboxFeatureHoverTooltipProps = {
  coordinates: MapboxProbeCoordinates;
  features: MapboxGeoJSONFeature[];
  clientX: number;
  clientY: number;
};

export function MapboxFeatureHoverTooltip({
  coordinates,
  features,
  clientX,
  clientY,
}: MapboxFeatureHoverTooltipProps) {
  const primary = pickPrimaryFeature(features);
  const details = primary ? featureDetailLines(primary) : [];
  const offset = 14;
  const coordLine = formatProbeCoordinatesLatLng(coordinates);
  const elevLine =
    coordinates.elevationMeters === null ? null : `${coordinates.elevationMeters.toFixed(1)} m`;

  return (
    <div
      data-test="mapbox-hover-tooltip"
      className="pointer-events-none fixed z-50 max-w-[16rem] rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
      style={{
        left: clientX + offset,
        top: clientY + offset,
      }}
    >
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
      {features.length > 1 ? (
        <p className="mt-1 text-[10px] text-base-content/45">+{features.length - 1} more</p>
      ) : null}
    </div>
  );
}
