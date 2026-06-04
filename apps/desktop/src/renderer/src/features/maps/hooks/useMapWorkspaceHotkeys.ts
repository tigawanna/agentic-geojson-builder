import { useHotkey } from "@tanstack/react-hotkeys";
import { SHORTCUT_IDS } from "@shared/shortcuts";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useAppShortcut } from "@renderer/shortcuts/useAppShortcut";

type UseMapWorkspaceHotkeysOptions = {
  enabled: boolean;
  onOpenHistory: () => void;
  onDeleteSelectedSegment: () => void;
  onClearSegmentSelection: () => void;
  highlightedSegmentId: number | null;
};

export function useMapWorkspaceHotkeys({
  enabled,
  onOpenHistory,
  onDeleteSelectedSegment,
  onClearSegmentSelection,
  highlightedSegmentId,
}: UseMapWorkspaceHotkeysOptions) {
  const controlsOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const toolsPanelOpen = useMapWorkspaceUiState((state) => state.toolsPanelOpen);
  const { openControls, closeControls, toggleToolsPanel, closeToolsPanel } =
    useMapWorkspaceUiActions();

  useAppShortcut(
    SHORTCUT_IDS.mapSettings,
    () => {
      if (controlsOpen) {
        closeControls();
      } else {
        openControls();
      }
    },
    { enabled },
  );

  useAppShortcut(SHORTCUT_IDS.openChangeHistory, onOpenHistory, { enabled });

  useAppShortcut(SHORTCUT_IDS.toggleToolsPanel, () => toggleToolsPanel(), { enabled });

  useAppShortcut(SHORTCUT_IDS.deleteSelectedSegment, onDeleteSelectedSegment, {
    enabled: enabled && highlightedSegmentId !== null,
  });

  useHotkey(
    asRegisterableHotkey("Escape"),
    () => {
      if (controlsOpen) {
        closeControls();
        return;
      }
      if (toolsPanelOpen) {
        closeToolsPanel();
        return;
      }
      if (highlightedSegmentId !== null) {
        onClearSegmentSelection();
      }
    },
    {
      enabled: enabled && (controlsOpen || toolsPanelOpen || highlightedSegmentId !== null),
    },
  );
}
