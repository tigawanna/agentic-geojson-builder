import { HotkeysProvider, useHotkey } from "@tanstack/react-hotkeys";
import type { ReactNode } from "react";
import { SHORTCUT_IDS, getShortcut } from "@shared/shortcuts";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";
import { KeyboardShortcutsModal } from "@renderer/shortcuts/KeyboardShortcutsModal";
import { useKeyboardShortcutsStore } from "@renderer/shortcuts/keyboard-shortcuts-store";

function KeyboardShortcutsHotkey() {
  const toggle = useKeyboardShortcutsStore((state) => state.toggle);
  const open = useKeyboardShortcutsStore((state) => state.open);
  const setOpen = useKeyboardShortcutsStore((state) => state.setOpen);

  useHotkey(asRegisterableHotkey(getShortcut(SHORTCUT_IDS.showKeyboardShortcuts).hotkey), () => {
    toggle();
  });

  useHotkey(
    asRegisterableHotkey("Escape"),
    () => {
      setOpen(false);
    },
    { enabled: open },
  );

  return null;
}

type KeyboardShortcutsProviderProps = {
  children: ReactNode;
};

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  return (
    <HotkeysProvider
      defaultOptions={{
        hotkey: {
          ignoreInputs: true,
          preventDefault: true,
        },
      }}
    >
      <KeyboardShortcutsHotkey />
      {children}
      <KeyboardShortcutsModal />
    </HotkeysProvider>
  );
}
