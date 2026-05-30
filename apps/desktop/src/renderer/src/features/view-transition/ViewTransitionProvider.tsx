import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  DEFAULT_VIEW_TRANSITION,
  parseViewTransitionStyle,
  type ViewTransitionStyle,
} from "@renderer/features/view-transition/view-transition-metadata";

interface ViewTransitionContextValue {
  style: ViewTransitionStyle;
  setStyle: (next: ViewTransitionStyle) => void;
}

const ViewTransitionContext = createContext<ViewTransitionContextValue | null>(null);
const STORAGE_KEY = "view-transition-style";

function applyViewTransitionStyle(style: ViewTransitionStyle) {
  const root = document.documentElement;
  if (style === "default") {
    delete root.dataset.style;
    return;
  }
  root.dataset.style = style;
}

export function ViewTransitionProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<ViewTransitionStyle>(() => {
    const current = document.documentElement.dataset.style;
    return parseViewTransitionStyle(current ?? DEFAULT_VIEW_TRANSITION);
  });

  useEffect(() => {
    void (async () => {
      const stored = await ipcInvoke("store:get", { key: STORAGE_KEY }).catch(() => null);
      if (stored) {
        const parsed = parseViewTransitionStyle(stored);
        setStyleState(parsed);
      }
    })();
  }, []);

  useEffect(() => {
    applyViewTransitionStyle(style);
  }, [style]);

  const setStyle = useCallback((next: ViewTransitionStyle) => {
    setStyleState(next);
    void ipcInvoke("store:set", { key: STORAGE_KEY, value: next });
  }, []);

  return (
    <ViewTransitionContext.Provider value={{ style, setStyle }}>
      {children}
    </ViewTransitionContext.Provider>
  );
}

export function useViewTransition() {
  const ctx = useContext(ViewTransitionContext);
  if (!ctx) throw new Error("useViewTransition must be used within ViewTransitionProvider");
  return ctx;
}
