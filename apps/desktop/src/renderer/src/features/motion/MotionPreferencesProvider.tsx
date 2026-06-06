import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  applyMotionPreferenceToDocument,
  DEFAULT_MOTION_PREFERENCE,
  parseMotionPreference,
  resolveAnimationsEnabled,
  resolvePageTransitionsEnabled,
  systemPrefersReducedMotion,
  type MotionPreference,
} from "@renderer/features/motion/motion-preferences";

interface MotionPreferencesContextValue {
  preference: MotionPreference;
  setPreference: (next: MotionPreference) => void;
  pageTransitionsPreference: boolean;
  setPageTransitionsPreference: (enabled: boolean) => void;
  animationsEnabled: boolean;
  pageTransitionsEnabled: boolean;
  systemPrefersReducedMotion: boolean;
}

const MotionPreferencesContext = createContext<MotionPreferencesContextValue | null>(null);
const STORAGE_KEY = "motion-preference";
const PAGE_TRANSITIONS_STORAGE_KEY = "page-transitions-enabled";

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>(DEFAULT_MOTION_PREFERENCE);
  const [pageTransitionsPreference, setPageTransitionsPreferenceState] = useState(true);
  const [systemReduced, setSystemReduced] = useState(() => systemPrefersReducedMotion());
  const animationsEnabled = resolveAnimationsEnabled(preference, systemReduced);
  const pageTransitionsEnabled = resolvePageTransitionsEnabled(
    animationsEnabled,
    pageTransitionsPreference,
  );

  useEffect(() => {
    void ipcInvoke("store:get", { key: STORAGE_KEY })
      .then((stored) => {
        if (stored) {
          setPreferenceState(parseMotionPreference(stored));
        }
      })
      .catch(() => undefined);

    void ipcInvoke("store:get", { key: PAGE_TRANSITIONS_STORAGE_KEY })
      .then((stored) => {
        if (typeof stored === "boolean") {
          setPageTransitionsPreferenceState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    applyMotionPreferenceToDocument(preference, animationsEnabled, pageTransitionsEnabled);
  }, [animationsEnabled, pageTransitionsEnabled, preference]);

  const setPreference = useCallback((next: MotionPreference) => {
    setPreferenceState(next);
    void ipcInvoke("store:set", { key: STORAGE_KEY, value: next });
  }, []);

  const setPageTransitionsPreference = useCallback((enabled: boolean) => {
    setPageTransitionsPreferenceState(enabled);
    void ipcInvoke("store:set", { key: PAGE_TRANSITIONS_STORAGE_KEY, value: enabled });
  }, []);

  return (
    <MotionPreferencesContext.Provider
      value={{
        preference,
        setPreference,
        pageTransitionsPreference,
        setPageTransitionsPreference,
        animationsEnabled,
        pageTransitionsEnabled,
        systemPrefersReducedMotion: systemReduced,
      }}
    >
      {children}
    </MotionPreferencesContext.Provider>
  );
}

export function useMotionPreferences() {
  const context = useContext(MotionPreferencesContext);
  if (!context) {
    throw new Error("useMotionPreferences must be used within MotionPreferencesProvider");
  }
  return context;
}

export function runWithOptionalViewTransition(update: () => void, animationsEnabled: boolean) {
  if (!animationsEnabled || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(update);
}
