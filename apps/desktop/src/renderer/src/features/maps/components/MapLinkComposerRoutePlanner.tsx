import { ChevronDown, ChevronUp, MapPin, Route, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import {
  MapPointSearchAddList,
  MapPointSearchPicker,
} from "@renderer/features/maps/components/MapPointSearchPicker";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { NeighborPathCandidate } from "@shared/neighbor-graph";
import type { MapPointRecord } from "@shared/map-points.types";
import type { useLinkRoutePlanner } from "@renderer/features/maps/hooks/useLinkRoutePlanner";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type RoutePlannerController = ReturnType<typeof useLinkRoutePlanner>;

type MapLinkComposerRoutePlannerProps = {
  mapPoints: MapPointRecord[];
  routePlanner: RoutePlannerController;
};

function markerLabel(mapPoints: MapPointRecord[], pointId: number) {
  const point = mapPoints.find((entry) => entry.id === pointId);
  return point ? resolveMapPointLinkRef(point) : `#${pointId}`;
}

type RouteAlternativeStripProps = {
  paths: NeighborPathCandidate[];
  mapPoints: MapPointRecord[];
  onUse: (pointIds: number[]) => void;
  useLabel: string;
  rankLabel: (rank: number, hops: number, distance: number) => string;
};

function RouteAlternativeStrip({
  paths,
  mapPoints,
  onUse,
  useLabel,
  rankLabel,
}: RouteAlternativeStripProps) {
  if (paths.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto pb-0.5">
      <div className="flex min-w-min gap-2">
        {paths.map((path, index) => (
          <div
            key={path.pointIds.join("-")}
            className="flex w-[15rem] shrink-0 flex-col gap-1.5 rounded-md border border-base-content/10 bg-base-100/60 p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-base-content/55">
                {rankLabel(
                  index + 1,
                  Math.max(0, path.pointIds.length - 1),
                  Math.round(path.totalDistanceMeters),
                )}
              </p>
              <button
                type="button"
                className="btn shrink-0 btn-outline btn-xs"
                onClick={() => onUse(path.pointIds)}
              >
                {useLabel}
              </button>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-min items-center gap-0.5">
                {path.pointIds.map((pointId, nodeIndex) => (
                  <span
                    key={`${path.pointIds.join("-")}-${pointId}-${nodeIndex}`}
                    className="flex items-center gap-0.5"
                  >
                    {nodeIndex > 0 ? (
                      <span className="px-0.5 text-[9px] text-base-content/30">→</span>
                    ) : null}
                    <span className="rounded bg-base-200/80 px-1.5 py-0.5 font-mono text-[10px] text-base-content/75">
                      {markerLabel(mapPoints, pointId)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapLinkComposerRoutePlanner({
  mapPoints,
  routePlanner,
}: MapLinkComposerRoutePlannerProps) {
  const { t } = useTranslation();
  const showNeighborLinkArrows = useMapWorkspaceUiState((state) => state.showNeighborLinkArrows);
  const { toggleShowNeighborLinkArrows } = useMapWorkspaceUiActions();
  const {
    pickTarget,
    setPickTarget,
    startId,
    setStartId,
    endId,
    setEndId,
    viaIds,
    assignPoint,
    removeVia,
    moveVia,
    calculatePath,
    clear,
    lastResult,
    liveAnalysis,
    routeAlternatives,
    applyPath,
  } = routePlanner;

  const pointsById = useMemo(
    () => new Map(mapPoints.map((point) => [point.id, point])),
    [mapPoints],
  );

  const startPoint = startId !== null ? (pointsById.get(startId) ?? null) : null;
  const viaAnchorPoint =
    viaIds.length > 0 ? (pointsById.get(viaIds.at(-1) ?? -1) ?? startPoint) : startPoint;

  const viaExcludeIds = useMemo(() => {
    const excluded = new Set<number>(viaIds);
    if (startId !== null) {
      excluded.add(startId);
    }
    if (endId !== null) {
      excluded.add(endId);
    }
    return [...excluded];
  }, [endId, startId, viaIds]);

  const canCalculate = startId !== null && endId !== null;

  const brokenLeg = liveAnalysis?.legs.find((leg) => !leg.found) ?? null;

  return (
    <section
      className="space-y-3 rounded-box border border-info/20 bg-info/5 p-3"
      data-test="link-composer-route-planner"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-info" />
          <p className="text-sm font-semibold">
            {t("maps.workspace.linkComposer.routePlanner.title")}
          </p>
        </div>
        <p className="text-xs text-base-content/60">
          {t("maps.workspace.linkComposer.routePlanner.hint")}
        </p>
      </div>

      <MapPointSearchPicker
        label={t("maps.workspace.linkComposer.routePlanner.start")}
        pointId={startId}
        mapPoints={mapPoints}
        pickActive={pickTarget === "start"}
        excludePointIds={endId !== null ? [endId] : []}
        onPickToggle={() => setPickTarget(pickTarget === "start" ? null : "start")}
        onClear={() => {
          setStartId(null);
          setPickTarget(null);
        }}
        onSelect={(pointId) => {
          assignPoint("start", pointId);
          setPickTarget(null);
        }}
      />

      <MapPointSearchPicker
        label={t("maps.workspace.linkComposer.routePlanner.end")}
        pointId={endId}
        mapPoints={mapPoints}
        pickActive={pickTarget === "end"}
        excludePointIds={startId !== null ? [startId] : []}
        nearbyAnchor={startPoint}
        onPickToggle={() => setPickTarget(pickTarget === "end" ? null : "end")}
        onClear={() => {
          setEndId(null);
          setPickTarget(null);
        }}
        onSelect={(pointId) => {
          assignPoint("end", pointId);
          setPickTarget(null);
        }}
      />

      <div className="space-y-2 rounded-lg border border-base-content/10 bg-base-100/30 p-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium tracking-wide text-base-content/45 uppercase">
              {t("maps.workspace.linkComposer.routePlanner.via")}
            </p>
            <button
              type="button"
              className={cn("btn btn-xs", pickTarget === "via" ? "btn-primary" : "btn-outline")}
              onClick={() => setPickTarget(pickTarget === "via" ? null : "via")}
            >
              <MapPin className="size-3" />
              {t("maps.workspace.linkComposer.routePlanner.addVia")}
            </button>
          </div>
          <p className="text-[11px] text-base-content/50">
            {t("maps.workspace.linkComposer.routePlanner.viaHint")}
          </p>
        </div>

        {viaIds.length === 0 ? (
          <p className="text-[11px] text-base-content/45">
            {t("maps.workspace.linkComposer.routePlanner.noVia")}
          </p>
        ) : (
          <ol className="space-y-1">
            {viaIds.map((pointId, index) => (
              <li
                key={pointId}
                className="flex items-center gap-1 rounded-md border border-base-content/10 bg-base-100/60 px-1.5 py-1"
              >
                <span className="w-4 shrink-0 text-center font-mono text-[10px] text-base-content/40">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {markerLabel(mapPoints, pointId)}
                </span>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    className="btn btn-square btn-ghost btn-xs"
                    disabled={index === 0}
                    onClick={() => moveVia(index, index - 1)}
                    aria-label={t("maps.workspace.linkComposer.routePlanner.moveViaUp")}
                  >
                    <ChevronUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-square btn-ghost btn-xs"
                    disabled={index === viaIds.length - 1}
                    onClick={() => moveVia(index, index + 1)}
                    aria-label={t("maps.workspace.linkComposer.routePlanner.moveViaDown")}
                  >
                    <ChevronDown className="size-3" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-square btn-ghost btn-xs"
                    onClick={() => removeVia(pointId)}
                    aria-label={t("maps.workspace.linkComposer.routePlanner.removeVia")}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <MapPointSearchAddList
          mapPoints={mapPoints}
          excludePointIds={viaExcludeIds}
          nearbyAnchor={viaAnchorPoint}
          placeholder={t("maps.workspace.linkComposer.routePlanner.addViaSearch")}
          onAdd={(pointId) => assignPoint("via", pointId)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn flex-1 btn-sm btn-primary"
          disabled={!canCalculate}
          onClick={calculatePath}
          data-test="link-composer-calculate-route"
        >
          {t("maps.workspace.linkComposer.routePlanner.calculate")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
          {t("maps.workspace.linkComposer.routePlanner.reset")}
        </button>
      </div>

      {lastResult?.found ? (
        <p className="text-xs text-base-content/60">
          {t("maps.workspace.linkComposer.routePlanner.preview", {
            count: lastResult.pointIds.length,
            distance: Math.round(lastResult.totalDistanceMeters),
          })}
        </p>
      ) : null}

      {brokenLeg ? (
        <p className="text-[11px] text-error">
          {t("maps.workspace.linkComposer.routePlanner.legBroken", {
            from: markerLabel(mapPoints, brokenLeg.fromPointId),
            to: markerLabel(mapPoints, brokenLeg.toPointId),
          })}
        </p>
      ) : null}

      {startId !== null && endId !== null && routeAlternatives ? (
        <div
          className="space-y-2 rounded-md border border-base-content/10 bg-base-100/40 px-2.5 py-2"
          data-test="route-planner-alternatives-debug"
        >
          <p className="text-[10px] font-medium tracking-wide text-base-content/45 uppercase">
            {t("maps.workspace.linkComposer.routePlanner.alternativesTitle", { count: 3 })}
          </p>
          {routeAlternatives.directTopPaths.length === 0 ? (
            <p className="text-[11px] text-base-content/45">
              {t("maps.workspace.linkComposer.routePlanner.debugNoAlternatives")}
            </p>
          ) : (
            <RouteAlternativeStrip
              paths={routeAlternatives.directTopPaths}
              mapPoints={mapPoints}
              useLabel={t("maps.workspace.linkComposer.routePlanner.debugUsePath")}
              rankLabel={(rank, hops, distance) =>
                t("maps.workspace.linkComposer.routePlanner.debugPathSummary", {
                  rank,
                  hops,
                  distance,
                })
              }
              onUse={applyPath}
            />
          )}
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-base-content/70 hover:bg-base-content/5">
        <input
          type="checkbox"
          className="checkbox checkbox-xs"
          checked={showNeighborLinkArrows}
          onChange={toggleShowNeighborLinkArrows}
        />
        {t("maps.workspace.linkComposer.routePlanner.showNeighborLinkArrows")}
      </label>
    </section>
  );
}
