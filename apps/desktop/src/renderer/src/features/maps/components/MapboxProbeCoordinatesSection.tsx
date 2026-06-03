import {
  copyProbeText,
  formatProbeCoordinatesGeoJson,
  formatProbeCoordinatesLatLng,
  formatProbeCoordinatesLngLatAlt,
  type MapboxProbeCoordinates,
} from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

type MapboxProbeCoordinatesSectionProps = {
  coordinates: MapboxProbeCoordinates;
};

export function MapboxProbeCoordinatesSection({ coordinates }: MapboxProbeCoordinatesSectionProps) {
  const { t } = useTranslation();
  const latLng = formatProbeCoordinatesLatLng(coordinates);
  const lngLatAlt = formatProbeCoordinatesLngLatAlt(coordinates);
  const geoJson = formatProbeCoordinatesGeoJson(coordinates);

  return (
    <section className="border-b border-base-300 px-4 py-3" data-test="mapbox-probe-coordinates">
      <p className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {t("mapboxViewer.coordinatesHeading")}
      </p>
      <dl className="mt-2 space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-base-content/50">{t("mapboxViewer.latitude")}</dt>
          <dd>{coordinates.latitude.toFixed(6)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-base-content/50">{t("mapboxViewer.longitude")}</dt>
          <dd>{coordinates.longitude.toFixed(6)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-base-content/50">{t("mapboxViewer.elevation")}</dt>
          <dd>
            {coordinates.elevationMeters === null
              ? t("mapboxViewer.elevationUnavailable")
              : `${coordinates.elevationMeters.toFixed(1)} m`}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <CopyCoordinateButton
          label={t("mapboxViewer.copyLatLng")}
          value={latLng}
          ariaLabel={t("mapboxViewer.copyLatLng")}
        />
        <CopyCoordinateButton
          label={t("mapboxViewer.copyLngLatAlt")}
          value={lngLatAlt}
          ariaLabel={t("mapboxViewer.copyLngLatAlt")}
        />
        <CopyCoordinateButton
          label={t("mapboxViewer.copyGeoJson")}
          value={geoJson}
          ariaLabel={t("mapboxViewer.copyGeoJson")}
        />
      </div>
    </section>
  );
}

function CopyCoordinateButton({
  label,
  value,
  ariaLabel,
}: {
  label: string;
  value: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className="btn gap-1 btn-outline btn-xs"
      onClick={() => void copyProbeText(value)}
      aria-label={ariaLabel}
      title={value}
    >
      <Copy className="size-3" />
      {label}
    </button>
  );
}
