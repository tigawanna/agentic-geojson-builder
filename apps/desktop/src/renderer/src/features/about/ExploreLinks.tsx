import { Link } from "@tanstack/react-router";
import { ArrowRight, History, Map, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";

const EXPLORE_LINKS = [
  {
    to: "/maps",
    icon: Map,
    preview: "maps",
    titleKey: "nav.maps",
    hintKey: "about.explore.mapsHint",
  },
  {
    to: "/audit-log",
    icon: History,
    preview: "history",
    titleKey: "nav.history",
    hintKey: "about.explore.historyHint",
  },
  {
    to: "/settings",
    icon: Settings,
    preview: "settings",
    titleKey: "nav.settings",
    hintKey: "about.explore.settingsHint",
  },
] as const;

function ExplorePreview({ variant }: { variant: (typeof EXPLORE_LINKS)[number]["preview"] }) {
  if (variant === "maps") {
    return (
      <div className="relative h-16 overflow-hidden rounded-lg border border-base-content/10 bg-[#1a2332] p-2">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[8px_8px]" />
        <div className="absolute top-2 left-2 size-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary/60" />
        <div className="absolute top-4 left-5 size-1 rounded-full bg-primary/70" />
        <div className="absolute top-3 right-3 size-1 rounded-full bg-primary/70" />
        <svg className="absolute inset-0 size-full p-2" viewBox="0 0 100 40" aria-hidden>
          <path
            d="M12 28 L35 18 L58 22 L88 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-500/80"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute right-1.5 bottom-1.5 h-7 w-9 rounded border border-white/15 bg-[#2a1810]/90 p-0.5">
          <div className="size-full rounded-sm bg-[#3d2518]/80" />
        </div>
      </div>
    );
  }

  if (variant === "history") {
    return (
      <div className="flex h-16 flex-col justify-center gap-1.5 rounded-lg border border-base-content/10 bg-base-200/30 p-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-2">
            <div className="size-2 shrink-0 rounded-full bg-base-content/15" />
            <div
              className="h-1 flex-1 rounded-full bg-base-content/10"
              style={{ maxWidth: row === 0 ? "85%" : row === 1 ? "70%" : "55%" }}
            />
            <span
              className={cn(
                "h-2 w-5 shrink-0 rounded-sm",
                row === 0 && "bg-success/60",
                row === 1 && "bg-warning/60",
                row === 2 && "bg-error/50",
              )}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-16 gap-2 rounded-lg border border-base-content/10 bg-base-200/30 p-2">
      <div className="flex w-5 shrink-0 flex-col gap-1 rounded bg-base-content/8 p-1">
        <div className="h-1 w-full rounded-full bg-primary/70" />
        <div className="h-1 w-full rounded-full bg-base-content/15" />
        <div className="h-1 w-full rounded-full bg-base-content/15" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-1 w-10 rounded-full bg-base-content/20" />
          <div className="h-3 w-6 rounded-full bg-primary/80 p-0.5">
            <div className="ml-auto size-2 rounded-full bg-white/90" />
          </div>
        </div>
        <div className="h-1 w-full rounded-full bg-base-content/10" />
        <div className="h-1 w-4/5 rounded-full bg-base-content/10" />
        <div className="mt-0.5 h-2 w-12 rounded bg-primary/25" />
      </div>
    </div>
  );
}

export function ExploreLinks() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {EXPLORE_LINKS.map(({ to, icon: Icon, preview, titleKey, hintKey }) => (
        <Link
          key={to}
          to={to}
          data-test={`explore-link-${to.replace("/", "") || "home"}`}
          className="group flex flex-col gap-3 rounded-xl border border-base-content/10 bg-base-100/30 p-3 text-left transition-all hover:border-primary/35 hover:bg-base-100/60 hover:ring-1 hover:ring-primary/15"
        >
          <ExplorePreview variant={preview} />
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-base-content/55 transition-colors group-hover:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(titleKey)}</p>
              <p className="text-[11px] text-base-content/45">{t(hintKey)}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-base-content/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}
