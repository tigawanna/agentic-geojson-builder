import { ChevronLeft, ChevronRight, ExternalLink, PanelLeft, PanelRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";

type MapWorkspacePanelToolbarProps = {
  side: "source" | "map";
  sourcePresentation?: "docked" | "collapsed" | "detached";
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  onPopOut?: () => void;
  className?: string;
};

export function MapWorkspacePanelToolbar({
  side,
  sourcePresentation = "docked",
  collapsed = false,
  onCollapse,
  onExpand,
  onPopOut,
  className,
}: MapWorkspacePanelToolbarProps) {
  const { t } = useTranslation();
  const isSource = side === "source";
  const isDetached = isSource && sourcePresentation === "detached";

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-1 rounded-box bg-base-100/90 p-0.5 shadow-sm",
        className,
      )}
    >
      {collapsed || isDetached ? (
        <button
          type="button"
          className="btn btn-square btn-ghost btn-xs"
          onClick={onExpand}
          aria-label={
            isSource
              ? t("maps.workspace.panels.expandSource")
              : t("maps.workspace.panels.expandMap")
          }
          title={
            isSource
              ? t("maps.workspace.panels.expandSource")
              : t("maps.workspace.panels.expandMap")
          }
        >
          {isSource ? <PanelLeft className="size-3.5" /> : <PanelRight className="size-3.5" />}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-square btn-ghost btn-xs"
          onClick={onCollapse}
          aria-label={
            isSource
              ? t("maps.workspace.panels.collapseSource")
              : t("maps.workspace.panels.collapseMap")
          }
          title={
            isSource
              ? t("maps.workspace.panels.collapseSource")
              : t("maps.workspace.panels.collapseMap")
          }
        >
          {isSource ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      )}

      {isSource && sourcePresentation === "docked" ? (
        <button
          type="button"
          className="btn btn-square btn-ghost btn-xs"
          onClick={onPopOut}
          aria-label={t("maps.workspace.panels.popOutSource")}
          title={t("maps.workspace.panels.popOutSource")}
        >
          <ExternalLink className="size-3.5" />
        </button>
      ) : null}

      {isSource && isDetached ? (
        <span className="px-1.5 text-[10px] font-medium text-base-content/55">
          {t("maps.workspace.panels.detached")}
        </span>
      ) : null}
    </div>
  );
}
