export type MotionPreference = "system" | "reduce" | "allow";

export const DEFAULT_MOTION_PREFERENCE: MotionPreference = "system";

export const MOTION_PREFERENCE_OPTIONS: MotionPreference[] = ["system", "reduce", "allow"];

export function parseMotionPreference(value: unknown): MotionPreference {
  return value === "reduce" || value === "allow" || value === "system"
    ? value
    : DEFAULT_MOTION_PREFERENCE;
}

export function systemPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolveAnimationsEnabled(
  preference: MotionPreference,
  systemReduced = systemPrefersReducedMotion(),
) {
  if (preference === "reduce") {
    return false;
  }
  if (preference === "allow") {
    return true;
  }
  return !systemReduced;
}

export function applyMotionPreferenceToDocument(
  preference: MotionPreference,
  animationsEnabled: boolean,
  pageTransitionsEnabled: boolean,
) {
  const root = document.documentElement;
  root.dataset.motionPreference = preference;
  if (animationsEnabled) {
    delete root.dataset.reduceMotion;
  } else {
    root.dataset.reduceMotion = "true";
  }
  if (animationsEnabled && pageTransitionsEnabled) {
    delete root.dataset.pageTransitions;
  } else {
    root.dataset.pageTransitions = "off";
  }
}

export function resolvePageTransitionsEnabled(
  animationsEnabled: boolean,
  pageTransitionsPreference: boolean,
) {
  return animationsEnabled && pageTransitionsPreference;
}
