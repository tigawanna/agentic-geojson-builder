import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useViewTransition } from "@renderer/features/view-transition/ViewTransitionProvider";
import {
  VIEW_TRANSITION_OPTIONS,
  type ViewTransitionStyle,
} from "@renderer/features/view-transition/view-transition-metadata";

function TransitionPreview({ variant }: { variant: ViewTransitionStyle }) {
  if (variant === "default") {
    return (
      <div className="relative h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
        <div className="absolute inset-2 rounded bg-base-100/90" />
        <div className="absolute inset-2 rounded bg-primary/25" />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className="relative h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-base-100/90" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary/20" />
        <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-base-content/20" />
      </div>
    );
  }

  if (variant === "wipe") {
    return (
      <div className="relative h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
        <div className="absolute inset-0 bg-base-100/90" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/25" />
        <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-base-content/25" />
      </div>
    );
  }

  if (variant === "angled") {
    return (
      <div className="relative h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
        <div className="absolute inset-0 bg-base-100/90" />
        <div
          className="absolute inset-0 bg-primary/25"
          style={{ clipPath: "polygon(0 0, 100% 0, 55% 100%, 0 100%)" }}
        />
      </div>
    );
  }

  if (variant === "flip") {
    return (
      <div className="relative h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
        <div className="absolute inset-y-2 left-2 w-[46%] skew-y-3 rounded bg-base-100/90" />
        <div className="absolute inset-y-2 right-2 w-[46%] -skew-y-3 rounded bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="relative flex h-14 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
      {[0, 22, 44, 66, 88].map((top, index) => (
        <div
          key={index}
          className="relative h-full flex-1 border-r border-base-content/10 last:border-r-0"
        >
          <div className="absolute inset-x-0 bottom-0 bg-primary/30" style={{ top: `${top}%` }} />
          <div
            className="absolute inset-x-0 bottom-0 bg-base-100/90"
            style={{ top: `${Math.max(0, top - 8)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function ViewTransitionSelector() {
  const { t } = useTranslation();
  const { style, setStyle } = useViewTransition();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {VIEW_TRANSITION_OPTIONS.map((value) => {
        const selected = style === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => setStyle(value)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                : "border-base-content/10 bg-base-100/30 hover:border-base-content/18 hover:bg-base-100/60",
            )}
          >
            <TransitionPreview variant={value} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(`viewTransition.${value}`)}</p>
              <p className="text-[11px] text-base-content/45">{t(`viewTransition.${value}Hint`)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
