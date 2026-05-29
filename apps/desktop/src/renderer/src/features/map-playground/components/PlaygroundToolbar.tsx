import { BaseMapStylePicker } from "@renderer/features/maps/components/BaseMapStylePicker";
import { PlaygroundLayersPanel } from "@renderer/features/map-playground/components/PlaygroundLayersPanel";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";
import type {
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import type { MapBaseMapStyle } from "@shared/maps.types";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { HelpCircle, Map, Mountain, PanelLeft, RotateCw, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

type PlaygroundToolbarProps = {
  layers: PlaygroundLayer[];
  selectedFeature: PlaygroundSelectedFeature | null;
  baseMapStyle: MapBaseMapStyle;
  elevationMode: boolean;
  hasElevationData: boolean;
  onToggleElevationMode: () => void;
  onBaseMapStyleChange: (style: MapBaseMapStyle) => void;
  onOpenFilePicker: () => void;
  onCreateGeoJson: () => void;
  onOpenGuide: () => void;
  onSelectFeature: (layerId: string, featureKey: string) => void;
  onSetFeatureVisible: (layerId: string, featureKey: string, visible: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
};

export function PlaygroundToolbar({
  layers,
  selectedFeature,
  baseMapStyle,
  elevationMode,
  hasElevationData,
  onToggleElevationMode,
  onBaseMapStyleChange,
  onOpenFilePicker,
  onCreateGeoJson,
  onOpenGuide,
  onSelectFeature,
  onSetFeatureVisible,
  onRemoveLayer,
}: PlaygroundToolbarProps) {
  const { t } = useTranslation();
  const { toggleSidebar, isCollapsed } = useSidebar();

  return (
    <div
      data-test="playground-toolbar"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex min-w-0 flex-wrap items-start gap-2 p-3"
    >
      <div className="pointer-events-auto flex max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-2xl border border-base-300 bg-base-100/95 px-2 py-2 shadow-lg backdrop-blur-sm sm:gap-2 sm:px-3">
        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-sm"
          onClick={toggleSidebar}
          aria-label={
            isCollapsed ? t("home.playground.expandSidebar") : t("home.playground.collapseSidebar")
          }
        >
          <PanelLeft className="size-4" />
        </button>

        <button
          type="button"
          className="btn shrink-0 btn-sm btn-primary"
          onClick={onOpenFilePicker}
        >
          <Upload className="size-4" />
          <span className="hidden sm:inline">{t("home.playground.dropGeoJson")}</span>
        </button>

        <button
          type="button"
          className="btn shrink-0 btn-sm btn-secondary"
          onClick={onCreateGeoJson}
        >
          <Map className="size-4" />
          <span className="hidden lg:inline">{t("home.playground.createGeoJson")}</span>
        </button>

        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-sm"
          onClick={onOpenGuide}
          aria-label={t("home.playground.showGuide")}
          title={t("home.playground.showGuide")}
        >
          <HelpCircle className="size-4" />
        </button>

        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-sm"
          onClick={() => void ipcInvoke("app:hardReload", undefined)}
          aria-label={t("home.playground.reload")}
          title={t("home.playground.reloadHint")}
          data-test="playground-reload"
        >
          <RotateCw className="size-4" />
        </button>
      </div>

      <div className="pointer-events-auto ml-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-1.5 rounded-2xl border border-base-300 bg-base-100/95 px-2 py-2 shadow-lg backdrop-blur-sm sm:gap-2 sm:px-3">
        <BaseMapStylePicker value={baseMapStyle} onChange={onBaseMapStyleChange} />

        <button
          type="button"
          className={`btn shrink-0 btn-sm ${elevationMode ? "btn-primary" : "btn-outline"}`}
          onClick={onToggleElevationMode}
          disabled={!hasElevationData}
          aria-pressed={elevationMode}
          title={
            hasElevationData
              ? t("home.playground.elevationModeHint")
              : t("home.playground.elevationModeUnavailable")
          }
        >
          <Mountain className="size-4" />
        </button>

        <PlaygroundLayersPanel
          layers={layers}
          selectedFeature={selectedFeature}
          onSelectFeature={onSelectFeature}
          onSetFeatureVisible={onSetFeatureVisible}
          onRemoveLayer={onRemoveLayer}
        />
      </div>
    </div>
  );
}

export function PlaygroundDropHint({ visible }: { visible: boolean }) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-primary/10 p-6">
      <div className="rounded-2xl border-2 border-dashed border-primary bg-base-100/95 px-8 py-6 text-center shadow-xl">
        <Upload className="mx-auto mb-3 size-8 text-primary" />
        <p className="text-lg font-semibold">{t("home.playground.dropHintTitle")}</p>
        <p className="mt-1 text-sm text-base-content/70">{t("home.playground.dropHintBody")}</p>
      </div>
    </div>
  );
}

export function PlaygroundNotice({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  if (!message && !error) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div
        className={`rounded-xl px-4 py-2 text-sm shadow-lg ${
          error ? "bg-error text-error-content" : "bg-base-100 text-base-content"
        }`}
      >
        {error ?? message}
      </div>
    </div>
  );
}
