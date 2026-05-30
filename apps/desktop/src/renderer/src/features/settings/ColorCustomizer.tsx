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

const RADIUS_TOKENS = [
  { key: "--radius-selector", label: "selector", min: 0, max: 1.5, step: 0.05, fallback: 0.5 },
  { key: "--radius-field", label: "field", min: 0, max: 1.5, step: 0.05, fallback: 0.5 },
  { key: "--radius-box", label: "box", min: 0, max: 2, step: 0.05, fallback: 0.5 },
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

function resolveRadiusRem(key: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  if (!raw) return fallback;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (raw.endsWith("px")) return parsed / 16;

  return parsed;
}

function resolveAllRadiusTokens(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const token of RADIUS_TOKENS) {
    result[token.key] = resolveRadiusRem(token.key, token.fallback);
  }
  return result;
}

export function ColorCustomizer() {
  const { t } = useTranslation();
  const { config, setThemeConfig } = useTheme();
  const overrides = config.overrides ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;

  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [resolvedRadius, setResolvedRadius] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setResolved(resolveAllTokens());
      setResolvedRadius(resolveAllRadiusTokens());
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

  function handleRadiusChange(key: string, value: number) {
    const next = { ...overrides, [key]: `${value}rem` };
    setThemeConfig({ ...config, overrides: next });
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
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {t("theme.customizeRadius")}
        </h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {RADIUS_TOKENS.map(({ key, label, min, max, step, fallback }) => {
            const current = overrides[key] ?? `${resolvedRadius[key] ?? fallback}rem`;
            const value = Number.parseFloat(current);
            const safeValue = Number.isFinite(value) ? value : fallback;

            return (
              <label key={key} className="space-y-2 rounded-lg border border-base-content/10 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{t(`theme.radius.${label}`)}</span>
                  <span className="font-mono text-base-content/45">{safeValue.toFixed(2)}rem</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={safeValue}
                  onChange={(e) => handleRadiusChange(key, Number.parseFloat(e.target.value))}
                  className="range w-full range-xs"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
