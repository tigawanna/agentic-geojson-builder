import { SHORTCUT_IDS } from "@shared/shortcuts";
import { useMapBaseRendererQuery } from "@renderer/features/maps/hooks/useMapBaseRenderer";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import { useAppShortcut } from "@renderer/shortcuts/useAppShortcut";

export function useDataExplorerInspectViewHotkeys() {
  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";
  const mapboxGlActive = baseRenderer === "mapbox-gl";
  const pageStore = useMapDataExplorerPageStore;

  useAppShortcut(
    SHORTCUT_IDS.toggleTrailInspect,
    () => {
      const state = pageStore.getState();
      state.setShowReferenceInspectTooltip(!state.showReferenceInspectTooltip);
    },
    { enabled: true },
  );

  useAppShortcut(
    SHORTCUT_IDS.mapboxInspect,
    () => {
      pageStore.getState().toggleMapboxInspectMode();
    },
    { enabled: mapboxGlActive },
  );
}
