import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@renderer/features/theme/ThemeProvider";

const COLOR_TOKENS = [
  { key: "--color-primary", label: "Primary" },
  { key: "--color-secondary", label: "Secondary" },
  { key: "--color-accent", label: "Accent" },
  { key: "--color-neutral", label: "Neutral" },
  { key: "--color-base-100", label: "Base 100" },
  { key: "--color-base-200", label: "Base 200" },
  { key: "--color-base-300", label: "Base 300" },
  { key: "--color-base-content", label: "Base Content" },
] as const;

function cssColorToHex(cssColor: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#888888";
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return `#${data[0]!.toString(16).padStart(2, "0")}${data[1]!.toString(16).padStart(2, "0")}${data[2]!.toString(16).padStart(2, "0")}`;
}

function resolveTokenHex(key: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  if (!raw) return "#888888";
  if (raw.startsWith("#")) return raw;
  if (raw.startsWith("oklch") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return cssColorToHex(raw);
  }
  return cssColorToHex(`oklch(${raw})`);
}

function resolveAllTokens(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { key } of COLOR_TOKENS) {
    result[key] = resolveTokenHex(key);
  }
  return result;
}

export function ColorCustomizer() {
  const { t } = useTranslation();
  const { config, setThemeConfig } = useTheme();
  const overrides = config.overrides ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;

  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setResolved(resolveAllTokens());
    });
    return () => cancelAnimationFrame(timer);
  }, [config.name]);

  function handleColorChange(key: string, value: string) {
    const next = { ...overrides, [key]: value };
    setThemeConfig({ ...config, overrides: next });
  }

  function handleReset() {
    setThemeConfig({ ...config, overrides: undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {t("theme.customizeColors")}
        </h4>
        {hasOverrides ? (
          <button type="button" onClick={handleReset} className="btn gap-1 btn-ghost btn-xs">
            <RotateCcw className="size-3" />
            {t("theme.resetColors")}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {COLOR_TOKENS.map(({ key, label }) => {
          const hex = overrides[key] ?? resolved[key] ?? "#888888";
          return (
            <label
              key={key}
              className="flex items-center gap-2 rounded-lg border border-base-content/10 p-2"
            >
              <input
                type="color"
                value={hex}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="size-7 shrink-0 cursor-pointer rounded border-none bg-transparent"
              />
              <div className="min-w-0">
                <span className="block text-xs font-medium">{label}</span>
                <span className="block font-mono text-[10px] text-base-content/40">{hex}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
