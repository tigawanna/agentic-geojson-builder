import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { BoundsPickerMap } from "./BoundsPickerMap";
import { BaseMapStylePicker } from "./BaseMapStylePicker";

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

      <BaseMapStylePicker value={cacheStyle} onChange={onStyleChange} />

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
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-medium text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
          onClick={onResetCorners}
        >
          {t("maps.create.resetPoints")}
        </button>
      </div>
    </div>
  );
}
