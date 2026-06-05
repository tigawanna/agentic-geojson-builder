import { GripVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MapPointRecord } from "@shared/map-points.types";

type MapLinkComposerChainListProps = {
  linkChain: number[];
  mapPoints: MapPointRecord[];
  onRemoveFromChain: (index: number) => void;
  onReorderChain: (fromIndex: number, toIndex: number) => void;
};

function resolveRef(mapPoints: MapPointRecord[], pointId: number): string {
  const point = mapPoints.find((entry) => entry.id === pointId);
  return point ? resolveMapPointLinkRef(point) : `#${pointId}`;
}

export function MapLinkComposerChainList({
  linkChain,
  mapPoints,
  onRemoveFromChain,
  onReorderChain,
}: MapLinkComposerChainListProps) {
  const { t } = useTranslation();

  if (linkChain.length === 0) {
    return (
      <p className="rounded-box border border-dashed border-base-content/15 bg-base-200/40 px-3 py-3 text-xs text-base-content/60">
        {t("maps.workspace.linkComposer.emptyChain")}
      </p>
    );
  }

  return (
    <ol className="space-y-1" data-test="link-composer-chain-list">
      {linkChain.map((pointId, index) => {
        const nextId = linkChain[index + 1];
        return (
          <li key={`${pointId}-${index}`} className="space-y-1">
            <div
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", String(index));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isNaN(fromIndex) || fromIndex === index) {
                  return;
                }
                onReorderChain(fromIndex, index);
              }}
              className={cn(
                "flex items-center gap-2 rounded-box border border-info/30 bg-info/10 px-2 py-2",
                "cursor-grab active:cursor-grabbing",
              )}
              data-test={`link-chain-item-${index}`}
            >
              <GripVertical className="size-3.5 shrink-0 text-base-content/35" />
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-info text-[10px] font-bold text-info-content">
                {index + 1}
              </span>
              <span className="flex-1 font-mono text-sm font-semibold">
                {resolveRef(mapPoints, pointId)}
              </span>
              <button
                type="button"
                className="btn btn-square text-error btn-ghost btn-xs"
                aria-label={t("maps.workspace.linkComposer.removeFromChain")}
                onClick={() => onRemoveFromChain(index)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {nextId !== undefined ? (
              <div className="flex items-center gap-2 pl-8 text-[11px] text-base-content/45">
                <span className="font-mono">↓</span>
                <span>
                  {t("maps.workspace.linkComposer.segmentPreview", {
                    from: resolveRef(mapPoints, pointId),
                    to: resolveRef(mapPoints, nextId),
                  })}
                </span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
