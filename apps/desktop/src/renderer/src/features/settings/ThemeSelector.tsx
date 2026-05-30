import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "@renderer/features/theme/ThemeProvider";
import { cn } from "@renderer/lib/utils";

const THEME_OPTIONS: Array<{
  value: Theme;
  icon: typeof Sun;
  preview: "light" | "dark" | "system";
}> = [
  { value: "light", icon: Sun, preview: "light" },
  { value: "dark", icon: Moon, preview: "dark" },
  { value: "system", icon: Monitor, preview: "system" },
];

function ThemePreview({ variant }: { variant: "light" | "dark" | "system" }) {
  if (variant === "system") {
    return (
      <div className="flex h-16 overflow-hidden rounded-lg border border-base-content/10">
        <div className="flex flex-1 flex-col gap-1.5 bg-[#f4f4f5] p-2">
          <div className="h-1.5 w-8 rounded-full bg-[#18181b]/20" />
          <div className="h-1 w-full rounded-full bg-[#18181b]/10" />
          <div className="h-1 w-4/5 rounded-full bg-[#18181b]/10" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 bg-[#18181b] p-2">
          <div className="h-1.5 w-8 rounded-full bg-white/25" />
          <div className="h-1 w-full rounded-full bg-white/12" />
          <div className="h-1 w-4/5 rounded-full bg-white/12" />
        </div>
      </div>
    );
  }

  const isLight = variant === "light";

  return (
    <div
      className={cn(
        "flex h-16 flex-col gap-1.5 rounded-lg border p-2",
        isLight ? "border-[#e4e4e7] bg-[#f4f4f5]" : "border-white/10 bg-[#18181b]",
      )}
    >
      <div className={cn("h-1.5 w-8 rounded-full", isLight ? "bg-[#18181b]/20" : "bg-white/25")} />
      <div className={cn("h-1 w-full rounded-full", isLight ? "bg-[#18181b]/10" : "bg-white/12")} />
      <div className={cn("h-1 w-4/5 rounded-full", isLight ? "bg-[#18181b]/10" : "bg-white/12")} />
      <div
        className={cn(
          "mt-auto h-2 w-10 rounded",
          isLight ? "bg-emerald-600/80" : "bg-emerald-500/70",
        )}
      />
    </div>
  );
}

export function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEME_OPTIONS.map(({ value, icon: Icon, preview }) => {
        const selected = theme === value;

        return (
          <button
            key={value}
            type="button"
            data-test={`theme-option-${value}`}
            aria-pressed={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                : "border-base-content/10 bg-base-100/30 hover:border-base-content/18 hover:bg-base-100/60",
            )}
          >
            <ThemePreview variant={preview} />
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  selected ? "text-primary" : "text-base-content/55",
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t(`theme.${value}`)}</p>
                <p className="text-[11px] text-base-content/45">{t(`theme.${value}Hint`)}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
