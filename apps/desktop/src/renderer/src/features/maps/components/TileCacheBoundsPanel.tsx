import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { BoundsPickerMap } from "./BoundsPickerMap";

type TileCacheBoundsPanelProps = {
  corners: TileCacheCorner[];
  cacheStyle: MapBaseMapStyle;
  locationQuery: string;
  latitude: string;
  longitude: string;
  onStyleChange: (style: MapBaseMapStyle) => void;
  onCornerAdd: (corner: TileCacheCorner) => void;
  onCornerMove: (index: number, corner: TileCacheCorner) => void;
  onResetCorners: () => void;
  mapHeightClassName?: string;
};

export function TileCacheBoundsPanel({
  corners,
  cacheStyle,
  locationQuery,
  latitude,
  longitude,
  onStyleChange,
  onCornerAdd,
  onCornerMove,
  onResetCorners,
  mapHeightClassName,
}: TileCacheBoundsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-base-content/60">
        {t("maps.create.cacheBoundsDescription")} {t("maps.create.cacheBoundsDragHint")}
      </p>

      <div className="flex flex-wrap gap-2">
        {(["satellite", "outline", "standard"] as const).map((style) => (
          <button
            key={style}
            type="button"
            className={`btn btn-sm ${cacheStyle === style ? "btn-primary" : "btn-outline"}`}
            onClick={() => onStyleChange(style)}
          >
            {t(`maps.create.baseMap.${style}`)}
          </button>
        ))}
      </div>

      <BoundsPickerMap
        corners={corners}
        locationQuery={locationQuery}
        latitude={latitude}
        longitude={longitude}
        style={cacheStyle}
        onCornerAdd={onCornerAdd}
        onCornerMove={onCornerMove}
        mapHeightClassName={mapHeightClassName}
      />

      <div className="flex items-center justify-between text-sm text-base-content/70">
        <span>{t("maps.create.cachePoints", { count: corners.length })}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onResetCorners}>
          {t("maps.create.resetPoints")}
        </button>
      </div>
    </div>
  );
}
