import { boundsFromCorners, estimateTileCount } from "@repo/tile-cache/tile-math";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { TILE_CACHE_ZOOM_MAX, TILE_CACHE_ZOOM_MIN } from "@shared/tile-cache.types";
import { BoundsPickerMap } from "@renderer/features/maps/components/BoundsPickerMap";
import { BaseMapStylePicker } from "@renderer/features/maps/components/BaseMapStylePicker";

type TileCacheBoundsPanelProps = {
  corners: TileCacheCorner[];
  cacheStyle: MapBaseMapStyle;
  minZoom: number;
  maxZoom: number;
  locationQuery: string;
  latitude: string;
  longitude: string;
  onStyleChange: (style: MapBaseMapStyle) => void;
  onMinZoomChange: (zoom: number) => void;
  onMaxZoomChange: (zoom: number) => void;
  onCornerAdd: (corner: TileCacheCorner) => void;
  onCornerMove: (index: number, corner: TileCacheCorner) => void;
  onResetCorners: () => void;
  mapHeightClassName?: string;
};

export function TileCacheBoundsPanel({
  corners,
  cacheStyle,
  minZoom,
  maxZoom,
  locationQuery,
  latitude,
  longitude,
  onStyleChange,
  onMinZoomChange,
  onMaxZoomChange,
  onCornerAdd,
  onCornerMove,
  onResetCorners,
  mapHeightClassName,
}: TileCacheBoundsPanelProps) {
  const { t } = useTranslation();

  const estimatedTiles = useMemo(() => {
    if (corners.length !== 4 || minZoom > maxZoom) {
      return null;
    }
    return estimateTileCount(boundsFromCorners(corners), minZoom, maxZoom);
  }, [corners, minZoom, maxZoom]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-base-content/60">
        {t("maps.create.cacheBoundsDescription")} {t("maps.create.cacheBoundsDragHint")}
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="form-control w-28 gap-1">
          <span className="label-text text-xs font-medium">{t("maps.create.cacheMinZoom")}</span>
          <input
            type="number"
            className="input-bordered input input-sm w-full"
            min={TILE_CACHE_ZOOM_MIN}
            max={maxZoom}
            value={minZoom}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(value)) {
                onMinZoomChange(value);
              }
            }}
          />
        </label>
        <label className="form-control w-28 gap-1">
          <span className="label-text text-xs font-medium">{t("maps.create.cacheMaxZoom")}</span>
          <input
            type="number"
            className="input-bordered input input-sm w-full"
            min={minZoom}
            max={TILE_CACHE_ZOOM_MAX}
            value={maxZoom}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(value)) {
                onMaxZoomChange(value);
              }
            }}
          />
        </label>
        {estimatedTiles != null ? (
          <p className="pb-2 text-sm text-base-content/60">
            {t("maps.create.cacheTileEstimate", { count: estimatedTiles })}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-base-content/50">{t("maps.create.cacheZoomHint")}</p>

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
