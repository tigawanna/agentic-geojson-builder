import { useHotkey } from "@tanstack/react-hotkeys";
import { SHORTCUT_IDS } from "@shared/shortcuts";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
  useMapWorkspaceUiStore,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useAppShortcut } from "@renderer/shortcuts/useAppShortcut";

const REFERENCE_INSPECT_TOOLTIP_STORE_KEY = "maps.referenceInspectTooltip";

type UseMapWorkspaceHotkeysOptions = {
  enabled: boolean;
  mapboxGlActive: boolean;
  onOpenHistory: () => void;
  onDeleteSelectedSegment: () => void;
  onClearSegmentSelection: () => void;
  highlightedSegmentId: number | null;
};

export function useMapWorkspaceHotkeys({
  enabled,
  mapboxGlActive,
  onOpenHistory,
  onDeleteSelectedSegment,
  onClearSegmentSelection,
  highlightedSegmentId,
}: UseMapWorkspaceHotkeysOptions) {
  const controlsOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const toolsPanelOpen = useMapWorkspaceUiState((state) => state.toolsPanelOpen);
  const uiStore = useMapWorkspaceUiStore();
  const {
    openControls,
    closeControls,
    toggleToolsPanel,
    closeToolsPanel,
    toggleMapboxInspectMode,
  } = useMapWorkspaceUiActions();

  useAppShortcut(
    SHORTCUT_IDS.toggleTrailInspect,
    () => {
      const state = uiStore.getState();
      const next = !state.showReferenceInspectTooltip;
      state.setShowReferenceInspectTooltip(next);
      void ipcInvoke("store:set", { key: REFERENCE_INSPECT_TOOLTIP_STORE_KEY, value: next });
    },
    { enabled },
  );

  useAppShortcut(SHORTCUT_IDS.mapboxInspect, () => toggleMapboxInspectMode(), {
    enabled: enabled && mapboxGlActive,
  });

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
