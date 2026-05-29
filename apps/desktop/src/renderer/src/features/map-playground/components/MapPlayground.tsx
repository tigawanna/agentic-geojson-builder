import { PlaygroundElevationLegend } from "@renderer/features/map-playground/components/PlaygroundElevationLegend";
import { PlaygroundMapPane } from "@renderer/features/map-playground/components/PlaygroundMapPane";
import { PlaygroundOnboardingModal } from "@renderer/features/map-playground/components/PlaygroundOnboardingModal";
import {
  PlaygroundDropHint,
  PlaygroundNotice,
  PlaygroundToolbar,
} from "@renderer/features/map-playground/components/PlaygroundToolbar";
import { TrailDetailPanel } from "@renderer/features/map-playground/components/TrailDetailPanel";
import { useMapPlayground } from "@renderer/features/map-playground/hooks/useMapPlayground";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const ONBOARDING_STORE_KEY = "playground.onboardingSeen";

export function MapPlayground() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const playground = useMapPlayground();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const checkedOnboardingRef = useRef(false);
  const detailOpen = playground.activeFeature !== null;

  useEffect(() => {
    if (checkedOnboardingRef.current) {
      return;
    }
    checkedOnboardingRef.current = true;

    ipcInvoke("store:get", { key: ONBOARDING_STORE_KEY }).then((value) => {
      if (!value) {
        setOnboardingOpen(true);
      }
    });
  }, []);

  function dismissOnboarding() {
    setOnboardingOpen(false);
    void ipcInvoke("store:set", { key: ONBOARDING_STORE_KEY, value: true });
  }

  function handleCreateGeoJson() {
    dismissOnboarding();
    void navigate({ to: "/maps/new" });
  }

  return (
    <div
      data-test="map-playground"
      className={`grid h-full min-h-0 w-full overflow-hidden bg-base-300 ${
        detailOpen ? "md:grid-cols-[minmax(0,1fr)_28rem]" : "grid-cols-1"
      }`}
      onDragOver={playground.handleDragOver}
      onDragLeave={playground.handleDragLeave}
      onDrop={playground.handleDrop}
    >
      <div className="relative min-h-0 min-w-0 overflow-hidden">
        <PlaygroundMapPane
          layers={playground.layers}
          selectedFeature={playground.selectedFeature}
          baseMapStyle={playground.baseMapStyle}
          initialViewport={playground.defaultViewport}
          elevationMode={playground.elevationMode}
          elevationRange={playground.elevationRange}
          onFeatureSelect={playground.selectFeature}
        />

        {playground.elevationMode && playground.elevationRange ? (
          <PlaygroundElevationLegend range={playground.elevationRange} />
        ) : null}

        <PlaygroundToolbar
          layers={playground.layers}
          selectedFeature={playground.selectedFeature}
          baseMapStyle={playground.baseMapStyle}
          onBaseMapStyleChange={playground.setBaseMapStyle}
          elevationMode={playground.elevationMode}
          hasElevationData={playground.hasElevationData}
          onToggleElevationMode={playground.toggleElevationMode}
          onOpenFilePicker={playground.openFilePicker}
          onCreateGeoJson={handleCreateGeoJson}
          onOpenGuide={() => setOnboardingOpen(true)}
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
      </div>

      {playground.activeFeature ? (
        <div className="absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col overflow-hidden bg-base-100 md:static md:z-auto">
          <TrailDetailPanel
            feature={playground.activeFeature}
            onClose={playground.clearSelection}
          />
        </div>
      ) : null}

      <PlaygroundOnboardingModal
        open={onboardingOpen}
        onClose={dismissOnboarding}
        onCreateGeoJson={handleCreateGeoJson}
      />
    </div>
  );
}
