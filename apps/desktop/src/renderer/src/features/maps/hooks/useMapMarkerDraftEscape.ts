import { useHotkey } from "@tanstack/react-hotkeys";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";

export function useMapMarkerDraftEscape(draftOpen: boolean, onClose: () => void, enabled = true) {
  useHotkey(
    asRegisterableHotkey("Escape"),
    () => {
      onClose();
    },
    { enabled: enabled && draftOpen },
  );
}
