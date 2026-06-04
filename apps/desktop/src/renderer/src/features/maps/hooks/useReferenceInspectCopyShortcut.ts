import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useInspectCopyHotkey } from "@renderer/shortcuts/useInspectCopyHotkey";

export function useReferenceInspectCopyShortcut() {
  const showReferenceInspectTooltip = useMapWorkspaceUiState(
    (state) => state.showReferenceInspectTooltip,
  );
  const mapboxInspectMode = useMapWorkspaceUiState((state) => state.mapboxInspectMode);
  const setStatusMessage = useMapWorkspaceUiActions().setStatusMessage;

  useInspectCopyHotkey({
    enabled: showReferenceInspectTooltip || mapboxInspectMode,
    showReferenceInspectTooltip,
    setStatusMessage,
    copiedMessageKey: "maps.workspace.coordinatesCopied",
  });
}
