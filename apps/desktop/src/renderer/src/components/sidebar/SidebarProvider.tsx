import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  parsePersistedSidebarState,
  SIDEBAR_STATE_STORE_KEY,
} from "@renderer/lib/ui-layout-storage";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidebarState>("expanded");

  useEffect(() => {
    void ipcInvoke("store:get", { key: SIDEBAR_STATE_STORE_KEY }).then((value) => {
      const stored = parsePersistedSidebarState(value);
      if (stored) {
        setState(stored);
      }
    });
  }, []);

  const persistSidebarState = useCallback((next: SidebarState) => {
    void ipcInvoke("store:set", { key: SIDEBAR_STATE_STORE_KEY, value: next });
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((current) => {
      const next = current === "expanded" ? "collapsed" : "expanded";
      persistSidebarState(next);
      return next;
    });
  }, [persistSidebarState]);

  const value = useMemo(
    () => ({
      state,
      isCollapsed: state === "collapsed",
      toggleSidebar,
    }),
    [state, toggleSidebar],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
