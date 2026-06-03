import { useEffect } from "react";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useMapWorkspaceToolsPanelShortcut(enabled: boolean) {
  const toolsPanelOpen = useMapWorkspaceUiState((state) => state.toolsPanelOpen);
  const controlsOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const { toggleToolsPanel, closeToolsPanel } = useMapWorkspaceUiActions();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        toggleToolsPanel();
        return;
      }

      if (event.key === "Escape" && toolsPanelOpen && !controlsOpen) {
        event.preventDefault();
        closeToolsPanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeToolsPanel, controlsOpen, enabled, toggleToolsPanel, toolsPanelOpen]);
}
