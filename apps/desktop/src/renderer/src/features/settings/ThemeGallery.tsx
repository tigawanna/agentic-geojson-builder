import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useTheme } from "@renderer/features/theme/ThemeProvider";
import { LIGHT_THEMES, DARK_THEMES, type ThemeMeta } from "@renderer/features/theme/theme-metadata";

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-test={`theme-card-${theme.name}`}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-base-content/10 hover:border-base-content/20 hover:bg-base-100/40",
      )}
    >
      <div
        data-theme={theme.name}
        className="flex h-14 items-end gap-1 overflow-hidden rounded-lg bg-base-100 p-2"
      >
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-1.5 w-10 rounded-full bg-base-content/20" />
          <div className="h-1 w-full rounded-full bg-base-content/10" />
        </div>
        <div className="flex gap-1 self-start">
          <div className="size-3 rounded-full bg-primary" />
          <div className="size-3 rounded-full bg-secondary" />
          <div className="size-3 rounded-full bg-accent" />
        </div>
      </div>
      <span className="text-xs font-medium capitalize">{theme.name}</span>
      {selected ? (
        <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-content">
          <Check className="size-3" />
        </div>
      ) : null}
    </button>
  );
}

export function ThemeGallery() {
  const { t } = useTranslation();
  const { config, setThemeConfig } = useTheme();

  function handleSelect(name: string) {
    setThemeConfig({ name, overrides: config.overrides });
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {t("theme.lightThemes")}
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {LIGHT_THEMES.map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              selected={config.name === theme.name}
              onSelect={() => handleSelect(theme.name)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {t("theme.darkThemes")}
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {DARK_THEMES.map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              selected={config.name === theme.name}
              onSelect={() => handleSelect(theme.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
