import { useCallback, useEffect, useRef } from "react";

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (event.key !== "z" && event.key !== "Z") {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo]);

  return { push, undo, redo, canUndo, canRedo, clear };
}
