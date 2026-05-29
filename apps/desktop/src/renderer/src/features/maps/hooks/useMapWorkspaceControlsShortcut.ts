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

export function useMapWorkspaceControlsShortcut(enabled: boolean) {
  const controlsOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const { openControls, closeControls } = useMapWorkspaceUiActions();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        if (controlsOpen) {
          closeControls();
        } else {
          openControls();
        }
        return;
      }

      if (event.key === "Escape" && controlsOpen) {
        event.preventDefault();
        closeControls();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeControls, controlsOpen, enabled, openControls]);
}
