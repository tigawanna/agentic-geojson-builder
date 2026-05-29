import {
  analyzeTrailFeature,
  formatDistance,
} from "@renderer/features/map-playground/lib/analyze-trail-feature";
import { getFeatureKey } from "@renderer/features/map-playground/lib/parse-playground-geojson";
import { trailFeatureColor } from "@renderer/features/map-playground/lib/trail-colors";
import type {
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import { Eye, EyeOff, Layers3, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type PlaygroundLayersPanelProps = {
  layers: PlaygroundLayer[];
  selectedFeature: PlaygroundSelectedFeature | null;
  onSelectFeature: (layerId: string, featureKey: string) => void;
  onSetFeatureVisible: (layerId: string, featureKey: string, visible: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
};

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string) {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

export function PlaygroundLayersPanel({
  layers,
  selectedFeature,
  onSelectFeature,
  onSetFeatureVisible,
  onRemoveLayer,
}: PlaygroundLayersPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const visibleTrailCount = layers.reduce((total, layer) => {
    if (!layer.visible) {
      return total;
    }
    return (
      total +
      layer.features.filter((feature) => !layer.hiddenFeatureKeys.includes(getFeatureKey(feature)))
        .length
    );
  }, 0);

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
        className={`btn btn-sm ${open ? "btn-primary" : "btn-outline"}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Layers3 className="size-4" />
        {t("home.playground.layers")}
        {layers.length > 0 ? (
          <span className="ml-0.5 badge badge-ghost badge-sm">{visibleTrailCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          data-test="playground-layers-panel"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 shadow-2xl backdrop-blur-md"
        >
          <div className="border-b border-base-300 px-4 py-3">
            <p className="text-sm font-semibold">{t("home.playground.layersPanelTitle")}</p>
            <p className="text-xs text-base-content/60">{t("home.playground.layersPanelHint")}</p>
          </div>

          <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
            {layers.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-base-content/60">
                {t("home.playground.noLayers")}
              </p>
            ) : (
              layers.map((layer) => (
                <section key={layer.id} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <p className="truncate text-[11px] font-semibold tracking-wide text-base-content/50 uppercase">
                      {layer.name}
                    </p>
                    <button
                      type="button"
                      className="btn text-error btn-ghost btn-xs"
                      onClick={() => onRemoveLayer(layer.id)}
                      aria-label={t("home.playground.removeLayer", { name: layer.name })}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <ul className="space-y-1">
                    {layer.features.map((feature) => {
                      const featureKey = getFeatureKey(feature);
                      const stats = analyzeTrailFeature(feature);
                      const color = trailFeatureColor(featureKey);
                      const visible = isFeatureVisible(layer, featureKey);
                      const isSelected =
                        selectedFeature?.layerId === layer.id &&
                        selectedFeature.featureKey === featureKey;

                      return (
                        <li key={`${layer.id}:${featureKey}`}>
                          <div
                            className={`flex items-start gap-2 rounded-xl border px-2 py-2 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-transparent hover:border-base-300 hover:bg-base-200/70"
                            }`}
                          >
                            <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={visible}
                                onChange={(event) => {
                                  onSetFeatureVisible(layer.id, featureKey, event.target.checked);
                                }}
                                aria-label={t("home.playground.toggleTrailVisibility", {
                                  name: stats.name,
                                })}
                              />
                            </label>

                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                onSelectFeature(layer.id, featureKey);
                                if (!visible) {
                                  onSetFeatureVisible(layer.id, featureKey, true);
                                }
                              }}
                            >
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
                            </button>

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
