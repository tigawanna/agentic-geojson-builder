import { MapboxFeatureHoverTooltip } from "@renderer/features/mapbox-viewer/components/MapboxFeatureHoverTooltip";
import {
  MapboxGlPane,
  type MapboxFlyToTarget,
} from "@renderer/features/mapbox-viewer/components/MapboxGlPane";
import { MapboxInspectPanel } from "@renderer/features/mapbox-viewer/components/MapboxInspectPanel";
import { MapboxLocationSearch } from "@renderer/features/mapbox-viewer/components/MapboxLocationSearch";
import { useMapboxCapturesQuery } from "@renderer/features/mapbox-viewer/hooks/useMapboxCapturesQuery";
import { buildCaptureFromProbe } from "@renderer/features/mapbox-viewer/lib/build-capture-from-probe";
import type { MapboxFeatureProbe } from "@renderer/features/mapbox-viewer/lib/mapbox-probe.types";
import { useMapboxViewerUiStore } from "@renderer/features/mapbox-viewer/store/mapbox-viewer-ui-store";
import { DEFAULT_MAP_VIEWPORT } from "@renderer/features/maps/lib/map-handle";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function MapboxViewerPage() {
  const { t } = useTranslation();
  const tokenQuery = useMapboxTokenQuery();
  const token = tokenQuery.data ?? null;
  const capturesQuery = useMapboxCapturesQuery();
  const createCapture = useIpcMutation("mapboxCaptures:create");

  const styleId = useMapboxViewerUiStore((state) => state.styleId);
  const inspectMode = useMapboxViewerUiStore((state) => state.inspectMode);
  const showApprovedCaptures = useMapboxViewerUiStore((state) => state.showApprovedCaptures);
  const showPendingCaptures = useMapboxViewerUiStore((state) => state.showPendingCaptures);

  const [hoverProbe, setHoverProbe] = useState<MapboxFeatureProbe | null>(null);
  const [pinnedProbe, setPinnedProbe] = useState<MapboxFeatureProbe | null>(null);
  const [flyTo, setFlyTo] = useState<MapboxFlyToTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeProbe = pinnedProbe ?? hoverProbe;
  const captures = capturesQuery.data?.captures ?? [];
  const pendingCount = captures.filter((capture) => !capture.approved).length;

  useEffect(() => {
    if (!inspectMode) {
      setHoverProbe(null);
      setPinnedProbe(null);
    }
  }, [inspectMode]);

  function showNoticeMessage(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  }

  function handleGoToLocation(latitude: number, longitude: number) {
    setFlyTo({
      latitude,
      longitude,
      zoom: 15,
      key: Date.now(),
    });
    setPinnedProbe(null);
    setHoverProbe(null);
  }

  async function handleCaptureProbe(probe: MapboxFeatureProbe) {
    try {
      const { capture } = await createCapture.mutateAsync(buildCaptureFromProbe(probe, styleId));
      setPinnedProbe(probe);
      showNoticeMessage(t("mapboxViewer.captureSaved", { title: capture.title }));
    } catch (error: unknown) {
      showNoticeMessage(error instanceof Error ? error.message : t("mapboxViewer.captureFailed"));
    }
  }

  if (tokenQuery.isLoading) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center">
        <span className="loading loading-md loading-spinner" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <Map className="size-10 text-base-content/40" />
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold">{t("mapboxViewer.tokenRequiredTitle")}</p>
          <p className="text-sm text-base-content/60">{t("mapboxViewer.tokenRequiredBody")}</p>
        </div>
        <Link to="/settings" className="btn btn-sm btn-primary">
          {t("mapboxViewer.openSettings")}
        </Link>
      </div>
    );
  }

  return (
    <div data-test="mapbox-viewer-page" className="relative h-full min-h-0 w-full">
      <MapboxGlPane
        accessToken={token}
        styleId={styleId}
        initialViewport={DEFAULT_MAP_VIEWPORT}
        flyTo={flyTo}
        inspectMode={inspectMode}
        probePinned={pinnedProbe !== null}
        captures={captures}
        showApprovedCaptures={showApprovedCaptures}
        showPendingCaptures={showPendingCaptures}
        onHoverProbe={setHoverProbe}
        onPinProbe={setPinnedProbe}
        onCaptureProbe={(probe) => void handleCaptureProbe(probe)}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-3">
        <MapboxLocationSearch
          onGoTo={handleGoToLocation}
          onError={(message) => showNoticeMessage(message)}
        />

        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/mapbox/captures"
            className="inline-flex items-center gap-1.5 rounded-md border border-base-content/12 bg-base-100/80 px-2.5 py-1 text-xs font-medium text-base-content/75 shadow-sm transition-colors hover:bg-base-content/8 hover:text-base-content"
          >
            {t("mapboxViewer.collection")}
            {captures.length > 0 ? (
              <span className="badge badge-xs badge-primary">
                {pendingCount || captures.length}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {inspectMode && activeProbe && !pinnedProbe ? (
        <MapboxFeatureHoverTooltip
          coordinates={{
            latitude: activeProbe.latitude,
            longitude: activeProbe.longitude,
            elevationMeters: activeProbe.elevationMeters,
          }}
          features={activeProbe.features}
          clientX={activeProbe.clientX}
          clientY={activeProbe.clientY}
        />
      ) : null}

      {inspectMode && activeProbe ? (
        <MapboxInspectPanel
          coordinates={{
            latitude: activeProbe.latitude,
            longitude: activeProbe.longitude,
            elevationMeters: activeProbe.elevationMeters,
          }}
          features={activeProbe.features}
          pinned={pinnedProbe !== null}
          onClose={() => {
            setPinnedProbe(null);
            setHoverProbe(null);
          }}
          onCapture={() => void handleCaptureProbe(activeProbe)}
          capturePending={createCapture.isPending}
        />
      ) : null}

      {notice ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="rounded-xl bg-base-100 px-4 py-2 text-sm shadow-lg">{notice}</div>
        </div>
      ) : null}
    </div>
  );
}
