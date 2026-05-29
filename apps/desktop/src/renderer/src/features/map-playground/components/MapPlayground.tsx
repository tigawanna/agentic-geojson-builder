import { PlaygroundMapPane } from "@renderer/features/map-playground/components/PlaygroundMapPane";
import {
  PlaygroundDropHint,
  PlaygroundNotice,
  PlaygroundToolbar,
} from "@renderer/features/map-playground/components/PlaygroundToolbar";
import { TrailDetailPanel } from "@renderer/features/map-playground/components/TrailDetailPanel";
import { useMapPlayground } from "@renderer/features/map-playground/hooks/useMapPlayground";
import { useTranslation } from "react-i18next";

export function MapPlayground() {
  const { t } = useTranslation();
  const playground = useMapPlayground();
  const detailPanelWidth = playground.activeFeature ? "max-w-md" : "";

  return (
    <div
      data-test="map-playground"
      className="relative h-full min-h-0 w-full overflow-hidden bg-base-300"
      onDragOver={playground.handleDragOver}
      onDragLeave={playground.handleDragLeave}
      onDrop={playground.handleDrop}
    >
      <div className={`absolute inset-0 ${playground.activeFeature ? "right-96" : "right-0"}`}>
        <PlaygroundMapPane
          layers={playground.layers}
          selectedFeature={playground.selectedFeature}
          baseMapStyle={playground.baseMapStyle}
          initialViewport={playground.defaultViewport}
          onFeatureSelect={playground.selectFeature}
        />
      </div>

      <PlaygroundToolbar
        layers={playground.layers}
        selectedFeature={playground.selectedFeature}
        baseMapStyle={playground.baseMapStyle}
        onBaseMapStyleChange={playground.setBaseMapStyle}
        onOpenFilePicker={playground.openFilePicker}
        onSelectFeature={playground.selectFeature}
        onSetFeatureVisible={playground.setFeatureVisible}
        onRemoveLayer={playground.removeLayer}
      />

      <PlaygroundDropHint visible={playground.isDragOver} />
      <PlaygroundNotice message={playground.notice} error={playground.errorNotice} />

      {playground.layers.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-4">
          <div className="glass-card max-w-lg px-5 py-4 text-center">
            <p className="text-sm font-medium">{t("home.playground.emptyTitle")}</p>
            <p className="mt-1 text-xs text-base-content/60">{t("home.playground.emptyBody")}</p>
          </div>
        </div>
      ) : null}

      {playground.activeFeature ? (
        <div className={`absolute inset-y-0 right-0 z-20 w-full ${detailPanelWidth}`}>
          <TrailDetailPanel
            feature={playground.activeFeature}
            onClose={playground.clearSelection}
          />
        </div>
      ) : null}
    </div>
  );
}
