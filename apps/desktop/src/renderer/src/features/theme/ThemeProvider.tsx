import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ipcInvoke } from "../../hooks/useIpc";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "theme";

function resolveSystem(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyClass(resolved: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveSystem());

  useEffect(() => {
    ipcInvoke("store:get", { key: STORAGE_KEY })
      .then((value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setThemeState(value);
        }
      })
      .catch(() => {
        /* fall back to default */
      });
  }, []);

  useEffect(() => {
    const r = theme === "system" ? resolveSystem() : theme;
    setResolved(r);
    applyClass(r);

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r2 = resolveSystem();
      setResolved(r2);
      applyClass(r2);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    void ipcInvoke("store:set", { key: STORAGE_KEY, value: next });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
