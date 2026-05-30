import { Bot, Download, History, Keyboard, Lightbulb, MapPin, Route, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExploreLinks } from "@renderer/features/about/ExploreLinks";
import { AppConfig } from "@renderer/utils/system";
import { useUpdater } from "@renderer/hooks/useUpdater";
import { useIpcQuery } from "@renderer/hooks/useIpc";

function formatPlatform(platform: string | undefined) {
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux") return "Linux";
  return platform ?? "—";
}

export function AboutPage() {
  const { t } = useTranslation();
  const { checkForUpdates } = useUpdater();
  const version = useIpcQuery("app:getVersion", undefined);
  const platform = useIpcQuery("app:getPlatform", undefined);
  const Icon = AppConfig.icon;

  const tips = [
    { icon: MapPin, titleKey: "about.tips.reference.title", bodyKey: "about.tips.reference.body" },
    { icon: Route, titleKey: "about.tips.trace.title", bodyKey: "about.tips.trace.body" },
    { icon: Download, titleKey: "about.tips.export.title", bodyKey: "about.tips.export.body" },
    { icon: Bot, titleKey: "about.tips.mcp.title", bodyKey: "about.tips.mcp.body" },
    { icon: History, titleKey: "about.tips.history.title", bodyKey: "about.tips.history.body" },
    {
      icon: Sparkles,
      titleKey: "about.tips.playground.title",
      bodyKey: "about.tips.playground.body",
    },
  ] as const;

  const shortcuts = [
    { keys: "Ctrl+,", labelKey: "about.shortcuts.controls" },
    { keys: "Ctrl+Shift+H", labelKey: "about.shortcuts.history" },
    { keys: "Ctrl+click", labelKey: "about.shortcuts.placePoint" },
  ] as const;

  return (
    <section className="animate-fade-in space-y-5">
      <article className="glass-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{AppConfig.name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-base-content/65">{AppConfig.brief}</p>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-base-content/45">{t("about.version")}</dt>
                <dd className="font-mono">{version.data ?? "…"}</dd>
              </div>
              <div>
                <dt className="text-xs text-base-content/45">{t("about.platform")}</dt>
                <dd>{formatPlatform(platform.data)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </article>

      <article className="glass-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <h3 className="text-base font-semibold">{t("about.tipsHeading")}</h3>
        </div>
        <p className="mb-4 text-sm text-base-content/55">{t("about.tipsIntro")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tips.map(({ icon: TipIcon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="rounded-xl border border-base-content/8 bg-base-100/30 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <TipIcon className="size-4 shrink-0 text-base-content/55" />
                <h4 className="text-sm font-medium">{t(titleKey)}</h4>
              </div>
              <p className="text-sm leading-relaxed text-base-content/60">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="glass-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard className="size-4 text-primary" />
          <h3 className="text-base font-semibold">{t("about.shortcutsHeading")}</h3>
        </div>
        <ul className="space-y-2">
          {shortcuts.map(({ keys, labelKey }) => (
            <li
              key={labelKey}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm"
            >
              <span className="text-base-content/70">{t(labelKey)}</span>
              <kbd className="kbd shrink-0 kbd-sm">{keys}</kbd>
            </li>
          ))}
        </ul>
      </article>

      <article className="glass-card p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">{t("about.exploreHeading")}</h3>
          <p className="mt-1 text-sm text-base-content/55">{t("about.exploreIntro")}</p>
        </div>
        <ExploreLinks />
      </article>

      <article className="glass-card p-5 sm:p-6">
        <h3 className="text-base font-semibold">{t("about.updatesHeading")}</h3>
        <p className="mt-1 text-sm text-base-content/55">{t("about.updatesHint")}</p>
        <button
          type="button"
          onClick={() => void checkForUpdates()}
          className="btn mt-4 btn-sm btn-primary"
        >
          {t("updater.check")}
        </button>
      </article>
    </section>
  );
}
