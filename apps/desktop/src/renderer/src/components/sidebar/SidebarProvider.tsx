import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidebarState>("expanded");

  const toggleSidebar = useCallback(() => {
    setState((current) => (current === "expanded" ? "collapsed" : "expanded"));
  }, []);

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
