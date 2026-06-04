import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import { useInspectCopyHotkey } from "@renderer/shortcuts/useInspectCopyHotkey";

export function useDataExplorerInspectCopyShortcut() {
  const showReferenceInspectTooltip = useMapDataExplorerPageStore(
    (state) => state.showReferenceInspectTooltip,
  );
  const mapboxInspectMode = useMapDataExplorerPageStore((state) => state.mapboxInspectMode);
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);

  useInspectCopyHotkey({
    enabled: showReferenceInspectTooltip || mapboxInspectMode,
    showReferenceInspectTooltip,
    setStatusMessage,
    copiedMessageKey: "maps.workspace.dataExplorer.inspect.copied",
    statusToastMs: null,
  });
}
