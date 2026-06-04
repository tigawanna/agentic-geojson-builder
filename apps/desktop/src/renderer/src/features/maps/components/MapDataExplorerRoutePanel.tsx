import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import type { FindRouteResult } from "@shared/routing.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { getViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import { lineStringToMapBounds } from "@renderer/features/maps/lib/segment-utils";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";

type MapDataExplorerRoutePanelProps = {
  mapId: number;
  mapPoints: MapPointRecord[];
};

function markerOptions(points: MapPointRecord[]) {
  return points
    .filter((point) => point.ref?.trim())
    .sort((left, right) => (left.ref ?? "").localeCompare(right.ref ?? ""));
}

export function MapDataExplorerRoutePanel({ mapId, mapPoints }: MapDataExplorerRoutePanelProps) {
  const { t } = useTranslation();
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const options = markerOptions(mapPoints);
  const [fromRef, setFromRef] = useState(options[0]?.ref ?? "");
  const [toRef, setToRef] = useState(options[1]?.ref ?? options[0]?.ref ?? "");
  const [viaText, setViaText] = useState("");
  const [result, setResult] = useState<FindRouteResult | null>(null);
  const findRoute = useIpcMutation("routing:findRoute");

  async function handleFind() {
    const viaRefs = viaText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      const route = await findRoute.mutateAsync({
        mapId,
        fromRef,
        toRef,
        viaRefs: viaRefs.length > 0 ? viaRefs : undefined,
      });
      setResult(route);
      if (route.found && route.geometry.coordinates.length >= 2) {
        const bounds = lineStringToMapBounds(route.geometry.coordinates);
        if (bounds) {
          getViewportCommand(mapId)?.({ fitBounds: bounds });
        }
        setStatusMessage(
          t("maps.workspace.dataExplorer.route.found", {
            distance: Math.round(route.totalLengthM),
          }),
        );
      } else {
        setStatusMessage(t("maps.workspace.dataExplorer.route.notFound"));
      }
    } catch (caught: unknown) {
      setStatusMessage(caught instanceof Error ? caught.message : String(caught));
      setResult(null);
    }
  }

  if (options.length < 2) {
    return (
      <p className="text-sm text-base-content/55" data-test="data-explorer-route-empty">
        {t("maps.workspace.dataExplorer.route.needMarkers")}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-test="data-explorer-route-panel">
      <div>
        <p className="text-sm font-semibold">{t("maps.workspace.dataExplorer.route.title")}</p>
        <p className="text-xs text-base-content/60">
          {t("maps.workspace.dataExplorer.route.hint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-control gap-1">
          <span className="label-text text-xs">{t("maps.workspace.dataExplorer.route.from")}</span>
          <select
            className="select-bordered select w-full select-sm font-mono"
            value={fromRef}
            onChange={(event) => setFromRef(event.target.value)}
          >
            {options.map((point) => (
              <option key={point.id} value={point.ref ?? ""}>
                {point.ref}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs">{t("maps.workspace.dataExplorer.route.to")}</span>
          <select
            className="select-bordered select w-full select-sm font-mono"
            value={toRef}
            onChange={(event) => setToRef(event.target.value)}
          >
            {options.map((point) => (
              <option key={point.id} value={point.ref ?? ""}>
                {point.ref}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="form-control gap-1">
        <span className="label-text text-xs">{t("maps.workspace.dataExplorer.route.via")}</span>
        <input
          className="input-bordered input input-sm w-full font-mono"
          placeholder="23a, 25"
          value={viaText}
          onChange={(event) => setViaText(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={findRoute.isPending || !fromRef || !toRef}
        onClick={() => void handleFind()}
        data-test="data-explorer-find-route"
      >
        {t("maps.workspace.dataExplorer.route.find")}
      </button>

      {result ? (
        <div className="space-y-2 rounded-box border border-base-content/10 bg-base-100/70 p-3 text-sm">
          {result.found ? (
            <>
              <p>
                {t("maps.workspace.dataExplorer.route.distance", {
                  meters: Math.round(result.totalLengthM),
                })}
              </p>
              <p className="font-mono text-xs text-base-content/70">
                {result.nodeRefs.join(" → ")}
              </p>
              <ul className="space-y-1 text-xs">
                {result.steps.map((step) => (
                  <li key={`${step.segmentEdgeId}-${step.fromRef}-${step.toRef}`}>
                    {step.fromRef} → {step.toRef} ({step.pathSlug})
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-base-content/60">
              {t("maps.workspace.dataExplorer.route.notFound")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
