import { BaseMapStylePicker } from "@renderer/features/maps/components/BaseMapStylePicker";
import { PlaygroundLayersPanel } from "@renderer/features/map-playground/components/PlaygroundLayersPanel";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";
import type {
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import type { MapBaseMapStyle } from "@shared/maps.types";
import { PanelLeft, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

type PlaygroundToolbarProps = {
  layers: PlaygroundLayer[];
  selectedFeature: PlaygroundSelectedFeature | null;
  baseMapStyle: MapBaseMapStyle;
  onBaseMapStyleChange: (style: MapBaseMapStyle) => void;
  onOpenFilePicker: () => void;
  onSelectFeature: (layerId: string, featureKey: string) => void;
  onSetFeatureVisible: (layerId: string, featureKey: string, visible: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
};

export function PlaygroundToolbar({
  layers,
  selectedFeature,
  baseMapStyle,
  onBaseMapStyleChange,
  onOpenFilePicker,
  onSelectFeature,
  onSetFeatureVisible,
  onRemoveLayer,
}: PlaygroundToolbarProps) {
  const { t } = useTranslation();
  const { toggleSidebar, isCollapsed } = useSidebar();

  return (
    <div
      data-test="playground-toolbar"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3"
    >
      <div className="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-base-300 bg-base-100/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm"
          onClick={toggleSidebar}
          aria-label={
            isCollapsed ? t("home.playground.expandSidebar") : t("home.playground.collapseSidebar")
          }
        >
          <PanelLeft className="size-4" />
        </button>

        <button type="button" className="btn btn-sm btn-primary" onClick={onOpenFilePicker}>
          <Upload className="size-4" />
          {t("home.playground.dropGeoJson")}
        </button>

        <BaseMapStylePicker value={baseMapStyle} onChange={onBaseMapStyleChange} />

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
