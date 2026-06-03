import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";

export const BASE_MAP_STYLE_ORDER: MapBaseMapStyle[] = [
  "standard",
  "satellite",
  "mapbox-outdoors",
  "mapbox-satellite",
  "outline",
];

export const CACHEABLE_BASE_MAP_STYLES: MapBaseMapStyle[] = ["standard", "satellite", "outline"];

type BaseMapStylePickerLayout = "inline" | "list";

type BaseMapStylePickerProps = {
  value: MapBaseMapStyle;
  onChange: (style: MapBaseMapStyle) => void;
  className?: string;
  layout?: BaseMapStylePickerLayout;
  styles?: MapBaseMapStyle[];
  disabledStyles?: MapBaseMapStyle[];
  disabledHint?: string;
};

export function BaseMapStylePicker({
  value,
  onChange,
  className,
  layout = "inline",
  styles = BASE_MAP_STYLE_ORDER,
  disabledStyles = [],
  disabledHint,
}: BaseMapStylePickerProps) {
  const { t } = useTranslation();
  const isList = layout === "list";

  return (
    <div
      className={
        isList
          ? `flex w-full flex-col gap-1 ${className ?? ""}`
          : `inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-base-100/50 p-1 ${className ?? ""}`
      }
      role="listbox"
      aria-label={t("maps.workspace.baseMap.dialogTitle")}
    >
      {styles.map((style) => {
        const disabled = disabledStyles.includes(style);
        const selected = value === style;
        return (
          <button
            key={style}
            type="button"
            disabled={disabled}
            title={disabled ? disabledHint : undefined}
            role="option"
            aria-selected={selected}
            className={
              isList
                ? `flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary/15 text-base-content"
                      : "border-base-300 bg-base-100 hover:border-base-content/20 hover:bg-base-200/80"
                  } ${disabled ? "cursor-not-allowed opacity-50" : ""}`
                : `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-base-content/65 hover:bg-base-content/8 hover:text-base-content"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`
            }
            onClick={() => onChange(style)}
          >
            <span>{t(`maps.workspace.baseMap.${style}`)}</span>
            {isList && disabled && disabledHint ? (
              <span className="ml-2 text-xs font-normal text-base-content/50">{disabledHint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
