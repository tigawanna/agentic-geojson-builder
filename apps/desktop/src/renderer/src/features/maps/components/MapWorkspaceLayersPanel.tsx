import { MAP_PLAYGROUND_FILLED_BTN } from "@renderer/features/maps/components/BaseMapStyleDialog";
import {
  analyzeTrailFeature,
  formatDistance,
} from "@renderer/features/map-playground/lib/analyze-trail-feature";
import { trailFeatureColor } from "@renderer/features/map-playground/lib/trail-colors";
import { getReferenceGeoJsonFeatureKey } from "@renderer/features/maps/lib/reference-geojson-feature-key";
import type { ReferenceGeoJsonFeature } from "@repo/isomorphic/reference-geojson";
import type { MapReferenceGeoJsonLayer } from "@shared/reference-geojson.types";
import { Eye, EyeOff, Layers3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type MapWorkspaceLayersPanelProps = {
  layers: MapReferenceGeoJsonLayer[];
  hiddenFeaturesByLayerId: Record<string, string[]>;
  showReferenceOverlay: boolean;
  visibleFeatureCount: number;
  onSetShowReferenceOverlay: (visible: boolean) => void;
  onSetLayerVisible: (layerId: string, visible: boolean) => void;
  onSetFeatureVisible: (layerId: string, featureKey: string, visible: boolean) => void;
  onSetLayerFeaturesVisible: (layerId: string, visible: boolean) => void;
  onSetAllLayersVisible: (visible: boolean) => void;
};

function isFeatureVisible(
  layer: MapReferenceGeoJsonLayer,
  featureKey: string,
  hiddenFeaturesByLayerId: Record<string, string[]>,
) {
  if (!layer.visible) {
    return false;
  }
  return !(hiddenFeaturesByLayerId[layer.id] ?? []).includes(featureKey);
}

function layerHasVisibleTrails(
  layer: MapReferenceGeoJsonLayer,
  hiddenFeaturesByLayerId: Record<string, string[]>,
) {
  if (!layer.visible) {
    return false;
  }
  const hidden = new Set(hiddenFeaturesByLayerId[layer.id] ?? []);
  return layer.collection.features.some(
    (feature, index) => !hidden.has(getReferenceGeoJsonFeatureKey(layer.id, feature, index)),
  );
}

function asPlaygroundFeature(feature: ReferenceGeoJsonFeature) {
  return feature as Parameters<typeof analyzeTrailFeature>[0];
}

export function MapWorkspaceLayersPanel({
  layers,
  hiddenFeaturesByLayerId,
  showReferenceOverlay,
  visibleFeatureCount,
  onSetShowReferenceOverlay,
  onSetLayerVisible,
  onSetFeatureVisible,
  onSetLayerFeaturesVisible,
  onSetAllLayersVisible,
}: MapWorkspaceLayersPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className={open ? "btn btn-sm btn-primary" : MAP_PLAYGROUND_FILLED_BTN}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-test="map-workspace-layers-toggle"
      >
        <Layers3 className="size-4" />
        {t("home.playground.layers")}
        {layers.length > 0 ? (
          <span className="ml-0.5 rounded-md bg-base-200/80 px-1.5 py-0.5 text-xs font-medium tabular-nums">
            {showReferenceOverlay ? visibleFeatureCount : 0}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          data-test="map-workspace-layers-panel"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 shadow-2xl backdrop-blur-md"
        >
          <div className="border-b border-base-300 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("home.playground.layersPanelTitle")}</p>
                <p className="text-xs text-base-content/60">
                  {t("maps.workspace.layersPanelHint")}
                </p>
              </div>
              {layers.length > 0 ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onSetAllLayersVisible(false)}
                  >
                    {t("home.playground.hideAllLayers")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onSetAllLayersVisible(true)}
                  >
                    {t("home.playground.showAllLayers")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {layers.length > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 border-b border-base-300 px-4 py-2.5">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={showReferenceOverlay}
                onChange={(event) => onSetShowReferenceOverlay(event.target.checked)}
              />
              <span className="text-sm font-medium">
                {t("maps.workspace.quickMenu.referenceOverlay")}
              </span>
            </label>
          ) : null}

          <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
            {layers.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-base-content/60">
                {t("maps.workspace.layersEmpty")}
              </p>
            ) : (
              layers.map((layer) => (
                <section key={layer.id} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs checkbox-primary"
                        checked={layer.visible}
                        onChange={(event) => onSetLayerVisible(layer.id, event.target.checked)}
                      />
                      <p className="truncate text-[11px] font-semibold tracking-wide text-base-content/50 uppercase">
                        {layer.name}
                      </p>
                    </label>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {layerHasVisibleTrails(layer, hiddenFeaturesByLayerId) ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => onSetLayerFeaturesVisible(layer.id, false)}
                        >
                          {t("home.playground.hideLayerTrails")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            onSetLayerVisible(layer.id, true);
                            onSetLayerFeaturesVisible(layer.id, true);
                          }}
                        >
                          {t("home.playground.showLayerTrails")}
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {layer.collection.features.map((feature, index) => {
                      const featureKey = getReferenceGeoJsonFeatureKey(layer.id, feature, index);
                      const stats = analyzeTrailFeature(asPlaygroundFeature(feature));
                      const color = trailFeatureColor(featureKey);
                      const visible =
                        showReferenceOverlay &&
                        isFeatureVisible(layer, featureKey, hiddenFeaturesByLayerId);

                      return (
                        <li key={featureKey}>
                          <div className="flex items-start gap-2 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-base-300 hover:bg-base-200/70">
                            <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={visible}
                                disabled={!showReferenceOverlay}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    onSetLayerVisible(layer.id, true);
                                  }
                                  onSetFeatureVisible(layer.id, featureKey, event.target.checked);
                                }}
                                aria-label={t("home.playground.toggleTrailVisibility", {
                                  name: stats.name,
                                })}
                              />
                            </label>

                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-2.5 shrink-0 rounded-full ring-2 ring-base-100"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate text-sm font-medium">{stats.name}</span>
                              </div>
                              <p className="mt-0.5 truncate pl-5 text-xs text-base-content/60">
                                {stats.lengthMeters !== null
                                  ? formatDistance(stats.lengthMeters)
                                  : t("home.playground.lengthUnknown")}
                                {stats.difficulty ? ` · ${stats.difficulty}` : ""}
                              </p>
                            </div>

                            <span
                              className="mt-0.5 shrink-0 text-base-content/40"
                              title={
                                visible
                                  ? t("home.playground.trailVisible")
                                  : t("home.playground.trailHidden")
                              }
                            >
                              {visible ? (
                                <Eye className="size-3.5" />
                              ) : (
                                <EyeOff className="size-3.5" />
                              )}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
