import { useTranslation } from "react-i18next";
import type { MapBaseRenderer } from "@shared/maps.types";

type MapEngineToggleProps = {
  value: MapBaseRenderer;
  onChange: (renderer: MapBaseRenderer) => void;
  disabled?: boolean;
};

export function MapEngineToggle({ value, onChange, disabled = false }: MapEngineToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="join">
      <button
        type="button"
        className={`btn join-item btn-sm ${value === "leaflet" ? "btn-primary" : "btn-outline"}`}
        disabled={disabled}
        onClick={() => onChange("leaflet")}
      >
        {t("maps.workspace.engineLeaflet")}
      </button>
      <button
        type="button"
        className={`btn join-item btn-sm ${value === "mapbox-gl" ? "btn-primary" : "btn-outline"}`}
        disabled={disabled}
        onClick={() => onChange("mapbox-gl")}
      >
        {t("maps.workspace.engineMapboxGl")}
      </button>
    </div>
  );
}
