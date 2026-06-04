import { useHotkeys } from "@tanstack/react-hotkeys";
import { getShortcutHotkeys, type ShortcutId } from "@shared/shortcuts";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";

export function useAppShortcut(
  id: ShortcutId,
  callback: () => void,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;

  useHotkeys(
    getShortcutHotkeys(id).map((hotkey) => ({
      hotkey: asRegisterableHotkey(hotkey),
      callback: () => {
        callback();
      },
      options: { enabled },
    })),
  );
}
