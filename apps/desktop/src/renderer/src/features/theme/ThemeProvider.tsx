import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  getThemeColorScheme,
  type ThemeColorScheme,
} from "@renderer/features/theme/theme-metadata";

export type ThemeConfig = {
  name: string;
  overrides?: Record<string, string>;
};

interface ThemeContextValue {
  config: ThemeConfig;
  colorScheme: ThemeColorScheme;
  setThemeConfig: (next: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "theme-config";
const LEGACY_KEY = "theme";

function resolveSystemScheme(): ThemeColorScheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveColorScheme(name: string): ThemeColorScheme {
  if (name === "system") return resolveSystemScheme();
  return getThemeColorScheme(name);
}

function resolveThemeName(name: string): string {
  if (name === "system") {
    return resolveSystemScheme() === "dark" ? "dark" : "light";
  }
  return name;
}

function applyToDocument(config: ThemeConfig): ThemeColorScheme {
  const root = document.documentElement;
  const resolvedName = resolveThemeName(config.name);
  const colorScheme = resolveColorScheme(config.name);

  root.classList.remove("light", "dark");
  root.classList.add(colorScheme);
  root.setAttribute("data-theme", resolvedName);

  const existingOverrides = root.dataset.themeOverrides;
  if (existingOverrides) {
    for (const key of existingOverrides.split(",")) {
      root.style.removeProperty(key);
    }
  }

  if (config.overrides && Object.keys(config.overrides).length > 0) {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(config.overrides)) {
      root.style.setProperty(key, value);
      keys.push(key);
    }
    root.dataset.themeOverrides = keys.join(",");
  } else {
    delete root.dataset.themeOverrides;
  }

  return colorScheme;
}

function migrateLegacyValue(value: unknown): ThemeConfig | null {
  if (value === "light" || value === "dark" || value === "system") {
    return { name: value };
  }
  return null;
}

function parseStoredConfig(value: unknown): ThemeConfig {
  if (value && typeof value === "object" && "name" in value) {
    const obj = value as Record<string, unknown>;
    return {
      name: typeof obj.name === "string" ? obj.name : "system",
      overrides:
        obj.overrides && typeof obj.overrides === "object"
          ? (obj.overrides as Record<string, string>)
          : undefined,
    };
  }
  return { name: "system" };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ThemeConfig>({ name: "system" });
  const [colorScheme, setColorScheme] = useState<ThemeColorScheme>(() => resolveSystemScheme());

  useEffect(() => {
    (async () => {
      let stored = await ipcInvoke("store:get", { key: STORAGE_KEY }).catch(() => null);

      if (!stored) {
        const legacy = await ipcInvoke("store:get", { key: LEGACY_KEY }).catch(() => null);
        const migrated = migrateLegacyValue(legacy);
        if (migrated) {
          stored = migrated;
          void ipcInvoke("store:set", { key: STORAGE_KEY, value: migrated });
        }
      }

      if (stored) {
        const parsed = parseStoredConfig(stored);
        setConfigState(parsed);
      }
    })();
  }, []);

  useEffect(() => {
    const scheme = applyToDocument(config);
    setColorScheme(scheme);

    if (config.name !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const newScheme = applyToDocument(config);
      setColorScheme(newScheme);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [config]);

  const setThemeConfig = useCallback((next: ThemeConfig) => {
    const apply = () => {
      setConfigState(next);
      void ipcInvoke("store:set", { key: STORAGE_KEY, value: next });
    };

    if (document.startViewTransition) {
      document.startViewTransition(apply);
      return;
    }

    apply();
  }, []);

  return (
    <ThemeContext.Provider value={{ config, colorScheme, setThemeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
