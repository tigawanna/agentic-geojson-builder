import { useCallback, useRef } from "react";
import { SHORTCUT_IDS } from "@shared/shortcuts";
import { useAppShortcut } from "@renderer/shortcuts/useAppShortcut";

type UndoEntry<T> = {
  label: string;
  undo: T;
  redo: T;
};

type UndoHistoryOptions = {
  maxEntries?: number;
};

export function useUndoHistory<T>(
  onApply: (entry: T) => void | Promise<void>,
  options: UndoHistoryOptions = {},
) {
  const { maxEntries = 50 } = options;
  const undoStackRef = useRef<UndoEntry<T>[]>([]);
  const redoStackRef = useRef<UndoEntry<T>[]>([]);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const push = useCallback(
    (entry: UndoEntry<T>) => {
      undoStackRef.current = [...undoStackRef.current.slice(-(maxEntries - 1)), entry];
      redoStackRef.current = [];
    },
    [maxEntries],
  );

  const undo = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) {
      return false;
    }
    redoStackRef.current.push(entry);
    void onApplyRef.current(entry.undo);
    return true;
  }, []);

  const redo = useCallback(() => {
    const entry = redoStackRef.current.pop();
    if (!entry) {
      return false;
    }
    undoStackRef.current.push(entry);
    void onApplyRef.current(entry.redo);
    return true;
  }, []);

  const canUndo = useCallback(() => undoStackRef.current.length > 0, []);
  const canRedo = useCallback(() => redoStackRef.current.length > 0, []);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  useAppShortcut(SHORTCUT_IDS.undo, () => {
    undo();
  });

  useAppShortcut(SHORTCUT_IDS.redo, () => {
    redo();
  });

  return { push, undo, redo, canUndo, canRedo, clear };
}
