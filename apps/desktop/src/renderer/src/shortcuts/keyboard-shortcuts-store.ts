import { create } from "zustand";

type KeyboardShortcutsStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useKeyboardShortcutsStore = create<KeyboardShortcutsStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
