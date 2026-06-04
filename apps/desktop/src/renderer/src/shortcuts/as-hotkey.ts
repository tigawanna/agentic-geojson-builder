import type { RegisterableHotkey } from "@tanstack/react-hotkeys";

export function asRegisterableHotkey(hotkey: string): RegisterableHotkey {
  return hotkey as RegisterableHotkey;
}
