import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { ComposerMarkerRow } from "@renderer/features/maps/lib/list-composer-markers";
import type { MapPointRecord } from "@shared/map-points.types";

type MapLinkComposerMarkerRowProps = {
  mapId: number;
  point: MapPointRecord;
  row: ComposerMarkerRow;
  onAppendToChain: (pointId: number) => void;
  onUpdated?: () => void;
};

export function MapLinkComposerMarkerRow({
  mapId,
  point,
  row,
  onAppendToChain,
  onUpdated,
}: MapLinkComposerMarkerRowProps) {
  const { t } = useTranslation();
  const updatePoint = useIpcMutation("mapPoints:update");
  const [expanded, setExpanded] = useState(false);
  const [ref, setRef] = useState(row.ref ?? "");

  useEffect(() => {
    setRef(row.ref ?? "");
  }, [row]);

  async function handleSaveRef() {
    await updatePoint.mutateAsync({
      mapId,
      pointId: point.id,
      ref: ref.trim() || null,
    });
    onUpdated?.();
  }

  const displayLabel = resolveMapPointLinkRef(point);

  return (
    <li className="rounded-md border border-base-content/10">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="w-5 shrink-0 font-mono text-[10px] text-base-content/40">
            {row.chainIndex ?? "·"}
          </span>
          <span className="truncate font-mono text-sm font-semibold">{displayLabel}</span>
          {row.distanceFromHeadMeters !== null && row.chainIndex === null ? (
            <span className="shrink-0 text-[10px] text-base-content/45">
              {Math.round(row.distanceFromHeadMeters)} m
            </span>
          ) : null}
          {row.neighborLabels.length > 0 ? (
            <span className="truncate text-[10px] text-base-content/45">
              {row.neighborLabels[0]}
            </span>
          ) : null}
          {row.savedSegmentLabels.length > 0 ? (
            <span className="truncate text-[10px] text-success">{row.savedSegmentLabels[0]}</span>
          ) : null}
        </button>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-xs"
          aria-label={t("maps.workspace.linkComposer.addToChain")}
          onClick={() => onAppendToChain(point.id)}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {expanded ? (
        <div className="space-y-2 border-t border-base-content/10 px-2 py-2">
          <label className="form-control gap-1">
            <span className="label-text text-[10px]">
              {t("maps.workspace.linkComposer.markerRef")}
            </span>
            <input
              className="input-bordered input input-xs w-full font-mono"
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              placeholder={t("maps.workspace.linkComposer.markerRefPlaceholder")}
            />
          </label>
          {row.neighborLabels.length > 0 ? (
            <p className="text-[10px] text-base-content/50">{row.neighborLabels.join(" · ")}</p>
          ) : null}
          <button
            type="button"
            className={cn("btn btn-outline btn-xs")}
            disabled={updatePoint.isPending}
            onClick={() => void handleSaveRef()}
          >
            {t("maps.workspace.linkComposer.saveMarkerHints")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
