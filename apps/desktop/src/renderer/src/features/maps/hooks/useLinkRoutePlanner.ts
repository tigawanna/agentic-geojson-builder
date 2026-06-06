import { useCallback, useMemo, useState } from "react";
import {
  analyzeNeighborRouteLegs,
  findTopNeighborRouteAlternatives,
  type AnalyzeNeighborRouteLegsResult,
  type FindNeighborPathResult,
  type NeighborRouteAlternativesResult,
} from "@shared/neighbor-graph";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

export type LinkRoutePickTarget = "start" | "end" | "via" | null;

export type LinkRoutePlannerState = {
  pickTarget: LinkRoutePickTarget;
  startId: number | null;
  endId: number | null;
  viaIds: number[];
  lastResult: FindNeighborPathResult | null;
};

type UseLinkRoutePlannerOptions = {
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  onApplyChain: (pointIds: number[]) => void;
  onStatusMessage?: (message: string | null) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useLinkRoutePlanner({
  mapPoints,
  markerNeighbors,
  onApplyChain,
  onStatusMessage,
  t,
}: UseLinkRoutePlannerOptions) {
  const [pickTarget, setPickTarget] = useState<LinkRoutePickTarget>(null);
  const [startId, setStartId] = useState<number | null>(null);
  const [endId, setEndId] = useState<number | null>(null);
  const [viaIds, setViaIds] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<FindNeighborPathResult | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AnalyzeNeighborRouteLegsResult | null>(null);

  const liveAnalysis = useMemo(() => {
    if (startId === null || endId === null) {
      return null;
    }
    return analyzeNeighborRouteLegs({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
    });
  }, [endId, mapPoints, markerNeighbors, startId, viaIds]);

  const routeAlternatives = useMemo((): NeighborRouteAlternativesResult | null => {
    if (startId === null || endId === null) {
      return null;
    }
    return findTopNeighborRouteAlternatives({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
      limit: 3,
    });
  }, [endId, mapPoints, markerNeighbors, startId, viaIds]);

  const applyPath = useCallback(
    (pointIds: number[]) => {
      if (pointIds.length < 2) {
        return;
      }
      onApplyChain(pointIds);
      const allCandidates = [
        ...(routeAlternatives?.directTopPaths ?? []),
        ...(routeAlternatives?.constrainedTopPaths ?? []),
        ...(routeAlternatives?.legTopPaths.flatMap((leg) => leg.paths) ?? []),
      ];
      const alternative = allCandidates.find(
        (path) =>
          path.pointIds.length === pointIds.length &&
          path.pointIds.every((pointId, index) => pointIds[index] === pointId),
      );
      setLastResult({
        pointIds,
        totalDistanceMeters: alternative?.totalDistanceMeters ?? 0,
        found: true,
      });
      onStatusMessage?.(
        t("maps.workspace.linkComposer.routePlanner.appliedAlternative", {
          count: pointIds.length,
        }),
      );
    },
    [onApplyChain, onStatusMessage, routeAlternatives, t],
  );

  const clear = useCallback(() => {
    setPickTarget(null);
    setStartId(null);
    setEndId(null);
    setViaIds([]);
    setLastResult(null);
    setLastAnalysis(null);
  }, []);

  const assignPoint = useCallback(
    (target: Exclude<LinkRoutePickTarget, null>, pointId: number) => {
      setLastResult(null);
      if (target === "start") {
        setStartId(pointId);
        setViaIds((current) => current.filter((id) => id !== pointId));
        if (endId === pointId) {
          setEndId(null);
        }
        return;
      }
      if (target === "end") {
        setEndId(pointId);
        setViaIds((current) => current.filter((id) => id !== pointId));
        if (startId === pointId) {
          setStartId(null);
        }
        return;
      }
      if (pointId === startId || pointId === endId || viaIds.includes(pointId)) {
        return;
      }
      setViaIds((current) => [...current, pointId]);
    },
    [endId, startId, viaIds],
  );

  const handleMapPointClickForRoutePick = useCallback(
    (pointId: number): boolean => {
      if (!pickTarget) {
        return false;
      }
      assignPoint(pickTarget, pointId);
      setPickTarget(null);
      const point = mapPoints.find((entry) => entry.id === pointId);
      onStatusMessage?.(
        t("maps.workspace.linkComposer.routePlanner.picked", {
          role: t(`maps.workspace.linkComposer.routePlanner.${pickTarget}`),
          ref: point ? resolveMapPointLinkRef(point) : String(pointId),
        }),
      );
      return true;
    },
    [assignPoint, mapPoints, onStatusMessage, pickTarget, t],
  );

  const calculatePath = useCallback(() => {
    if (startId === null || endId === null) {
      onStatusMessage?.(t("maps.workspace.linkComposer.routePlanner.needEndpoints"));
      return;
    }

    const result = analyzeNeighborRouteLegs({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
    });

    setLastAnalysis(result);
    setLastResult(result.merged);

    if (!result.merged.found) {
      const brokenLeg = result.legs.find((leg) => !leg.found);
      if (brokenLeg) {
        const fromPoint = mapPoints.find((entry) => entry.id === brokenLeg.fromPointId);
        const toPoint = mapPoints.find((entry) => entry.id === brokenLeg.toPointId);
        onStatusMessage?.(
          t("maps.workspace.linkComposer.routePlanner.legBroken", {
            from: fromPoint ? resolveMapPointLinkRef(fromPoint) : String(brokenLeg.fromPointId),
            to: toPoint ? resolveMapPointLinkRef(toPoint) : String(brokenLeg.toPointId),
          }),
        );
      } else {
        onStatusMessage?.(t("maps.workspace.linkComposer.routePlanner.noPath"));
      }
      return;
    }

    onApplyChain(result.merged.pointIds);
    onStatusMessage?.(
      t("maps.workspace.linkComposer.routePlanner.calculated", {
        count: result.merged.pointIds.length,
      }),
    );
  }, [endId, mapPoints, markerNeighbors, onApplyChain, onStatusMessage, startId, t, viaIds]);

  const removeVia = useCallback((pointId: number) => {
    setViaIds((current) => current.filter((id) => id !== pointId));
    setLastResult(null);
  }, []);

  const moveVia = useCallback((fromIndex: number, toIndex: number) => {
    setViaIds((current) => {
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (moved === undefined) {
        return current;
      }
      next.splice(toIndex, 0, moved);
      return next;
    });
    setLastResult(null);
  }, []);

  return {
    pickTarget,
    setPickTarget,
    startId,
    setStartId,
    endId,
    setEndId,
    viaIds,
    setViaIds,
    lastResult,
    lastAnalysis,
    liveAnalysis,
    routeAlternatives,
    clear,
    assignPoint,
    removeVia,
    moveVia,
    handleMapPointClickForRoutePick,
    calculatePath,
    applyPath,
  };
}
