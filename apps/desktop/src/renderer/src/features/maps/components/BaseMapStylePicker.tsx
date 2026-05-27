import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";

export const BASE_MAP_STYLE_ORDER: MapBaseMapStyle[] = ["standard", "satellite", "outline"];

type BaseMapStylePickerProps = {
  value: MapBaseMapStyle;
  onChange: (style: MapBaseMapStyle) => void;
  className?: string;
};

export function BaseMapStylePicker({ value, onChange, className }: BaseMapStylePickerProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-base-100/50 p-1 ${className ?? ""}`}
    >
      {BASE_MAP_STYLE_ORDER.map((style) => (
        <button
          key={style}
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === style
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/65 hover:bg-base-content/8 hover:text-base-content"
          }`}
          onClick={() => onChange(style)}
        >
          {t(`maps.workspace.baseMap.${style}`)}
        </button>
      ))}
    </div>
  );
}
