import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@renderer/features/theme/ThemeProvider";
import { cn } from "@renderer/lib/utils";

const MODE_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

export function ThemeModeSelector() {
  const { t } = useTranslation();
  const { config, setThemeConfig } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MODE_OPTIONS.map(({ value, icon: Icon }) => {
        const selected = config.name === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => setThemeConfig({ name: value, overrides: config.overrides })}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                : "border-base-content/10 bg-base-100/30 hover:border-base-content/18 hover:bg-base-100/60",
            )}
          >
            <Icon
              className={cn("size-5 shrink-0", selected ? "text-primary" : "text-base-content/55")}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(`theme.${value}`)}</p>
              <p className="text-[11px] text-base-content/45">{t(`theme.${value}Hint`)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
