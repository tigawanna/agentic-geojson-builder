import { Gauge, Monitor, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import {
  MOTION_PREFERENCE_OPTIONS,
  type MotionPreference,
} from "@renderer/features/motion/motion-preferences";
import { useMotionPreferences } from "@renderer/features/motion/MotionPreferencesProvider";

const OPTION_ICONS: Record<MotionPreference, typeof Monitor> = {
  system: Monitor,
  reduce: Gauge,
  allow: Sparkles,
};

export function MotionPreferenceSelector() {
  const { t } = useTranslation();
  const {
    preference,
    setPreference,
    pageTransitionsPreference,
    setPageTransitionsPreference,
    animationsEnabled,
    pageTransitionsEnabled,
    systemPrefersReducedMotion,
  } = useMotionPreferences();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {MOTION_PREFERENCE_OPTIONS.map((value) => {
            const selected = preference === value;
            const Icon = OPTION_ICONS[value];

            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setPreference(value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                    : "border-base-content/10 bg-base-100/30 hover:border-base-content/18 hover:bg-base-100/60",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    selected ? "text-primary" : "text-base-content/55",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(`settings.motion.${value}`)}</p>
                  <p className="text-[11px] text-base-content/45">
                    {t(`settings.motion.${value}Hint`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-base-content/50">
          {!animationsEnabled
            ? preference === "system" && systemPrefersReducedMotion
              ? t("settings.motion.statusSystemReduced")
              : t("settings.motion.statusDisabled")
            : preference === "allow" && systemPrefersReducedMotion
              ? t("settings.motion.statusOverrideEnabled")
              : t("settings.motion.statusEnabled")}
        </p>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 px-3 py-3",
          !animationsEnabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          type="checkbox"
          className="checkbox mt-0.5 checkbox-sm checkbox-primary"
          checked={pageTransitionsPreference}
          disabled={!animationsEnabled}
          onChange={(event) => setPageTransitionsPreference(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{t("settings.motion.pageTransitions")}</span>
          <span className="mt-0.5 block text-[11px] text-base-content/45">
            {t("settings.motion.pageTransitionsHint")}
          </span>
          {!pageTransitionsEnabled && animationsEnabled ? (
            <span className="mt-1 block text-[11px] text-base-content/45">
              {t("settings.motion.pageTransitionsOffNote")}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
