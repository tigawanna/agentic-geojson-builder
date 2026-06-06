import { useEffect, useState } from "react";
import { ClipboardPaste, Mountain, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MapPointRecord } from "@shared/map-points.types";
import {
  MAP_POINT_TYPES,
  mapPointTypeToFields,
  resolveMapPointTypeFromRecord,
  type MapPointType,
} from "@shared/map-point-type";
import type { ControlPointRecord } from "@shared/control-points.types";
import { CoordinateTripleInput } from "@renderer/features/maps/components/CoordinateTripleInput";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { getReferenceInspectCopyTarget } from "@renderer/features/maps/lib/reference-inspect-copy-registry";
import {
  parseCoordinateTripleForSave,
  type CoordinateTriple,
} from "@renderer/features/maps/lib/parse-coordinate-paste";
import { useInheritControlPointAltitude } from "@renderer/features/maps/hooks/useInheritControlPointAltitude";
import {
  useMapDataExplorerPageStore,
  type MapDataExplorerEditTarget,
} from "@renderer/features/maps/store/map-data-explorer-page-store";

type MapDataExplorerEditDialogProps = {
  mapId: number;
  target: MapDataExplorerEditTarget;
  controlPoint: ControlPointRecord | null;
  mapPoint: MapPointRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

function toTriple(latitude: number, longitude: number, altitude: number | null): CoordinateTriple {
  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    altitude: altitude !== null ? String(altitude) : "",
  };
}

export function MapDataExplorerEditDialog({
  mapId,
  target,
  controlPoint,
  mapPoint,
  onClose,
  onSaved,
}: MapDataExplorerEditDialogProps) {
  const { t } = useTranslation();
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const updateControlPoint = useIpcMutation("controlPoints:update");
  const updateMapPoint = useIpcMutation("mapPoints:update");
  const { inherit: inheritAltitude, isPending: inheritPending } =
    useInheritControlPointAltitude(mapId);

  const [coordinates, setCoordinates] = useState<CoordinateTriple>({
    latitude: "",
    longitude: "",
    altitude: "",
  });
  const [label, setLabel] = useState("");
  const [poleNumber, setPoleNumber] = useState("");
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [pointType, setPointType] = useState<MapPointType>("custom");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (target.kind === "control-point" && controlPoint) {
      setCoordinates(
        toTriple(controlPoint.latitude, controlPoint.longitude, controlPoint.altitudeM),
      );
      setLabel(controlPoint.label ?? "");
      setPoleNumber(controlPoint.poleNumber ?? "");
      setSaveError(null);
      return;
    }
    if (target.kind === "map-point" && mapPoint) {
      setCoordinates(toTriple(mapPoint.latitude, mapPoint.longitude, mapPoint.elevation));
      setName(mapPoint.name ?? "");
      setRef(mapPoint.ref ?? "");
      setPointType(resolveMapPointTypeFromRecord(mapPoint));
      setSaveError(null);
    }
  }, [controlPoint, mapPoint, target]);

  function applyInspectClipboard() {
    const inspect = getReferenceInspectCopyTarget();
    if (!inspect) {
      setSaveError(t("maps.workspace.dataExplorer.edit.noInspectTarget"));
      return;
    }
    setCoordinates(toTriple(inspect.latitude, inspect.longitude, inspect.elevationMeters));
    setSaveError(null);
  }

  async function handleInheritAltitude() {
    if (!controlPoint) {
      return;
    }
    setSaveError(null);
    try {
      const updated = await inheritAltitude(controlPoint);
      setCoordinates(toTriple(updated.latitude, updated.longitude, updated.altitudeM));
      setStatusMessage(t("maps.workspace.dataExplorer.edit.inheritedAltitude"));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleSave() {
    const parsed = parseCoordinateTripleForSave(coordinates);
    if (parsed.error) {
      setSaveError(parsed.error);
      return;
    }

    if (target.kind === "control-point" && controlPoint) {
      updateControlPoint.mutate(
        {
          mapId,
          controlPointId: controlPoint.id,
          imageX: controlPoint.imageX,
          imageY: controlPoint.imageY,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          altitudeM: parsed.altitudeM,
          label: label.trim() || null,
          poleNumber: poleNumber.trim() || null,
          description: controlPoint.description,
        },
        {
          onSuccess: () => {
            onSaved();
            onClose();
          },
          onError: (error) => setSaveError(error.message),
        },
      );
      return;
    }

    if (target.kind === "map-point" && mapPoint) {
      const { category, nodeRole } = mapPointTypeToFields(pointType);
      updateMapPoint.mutate(
        {
          mapId,
          pointId: mapPoint.id,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          elevation: parsed.altitudeM,
          elevationSource: parsed.altitudeM !== null ? "manual" : null,
          name: name.trim() || null,
          ref: ref.trim() || null,
          category,
          nodeRole,
        },
        {
          onSuccess: () => {
            onSaved();
            onClose();
          },
          onError: (error) => setSaveError(error.message),
        },
      );
    }
  }

  const title =
    target.kind === "control-point"
      ? (controlPoint?.label ??
        controlPoint?.poleNumber ??
        t("maps.workspace.dataExplorer.referencePoint", { id: controlPoint?.id ?? 0 }))
      : (mapPoint?.name ?? mapPoint?.ref ?? `#${mapPoint?.id ?? 0}`);

  const pending = updateControlPoint.isPending || updateMapPoint.isPending;

  return (
    <div className="modal-open modal z-1300" data-test="data-explorer-edit-dialog">
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t("maps.workspace.dataExplorer.edit.close")}
        onClick={onClose}
      />
      <div className="modal-box max-w-lg overflow-hidden p-0 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-base-content/10 bg-linear-to-r from-primary/10 to-transparent px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              {t("maps.workspace.dataExplorer.edit.title")}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            className="btn btn-square shrink-0 btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t("maps.workspace.dataExplorer.edit.close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <section className="space-y-3 rounded-xl border border-base-content/10 bg-base-200/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
                {t("maps.workspace.dataExplorer.edit.location")}
              </h4>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn gap-1 btn-ghost btn-xs"
                  onClick={applyInspectClipboard}
                >
                  <ClipboardPaste className="size-3" />
                  {t("maps.workspace.dataExplorer.edit.fromInspect")}
                </button>
                {target.kind === "control-point" ? (
                  <button
                    type="button"
                    className="btn gap-1 btn-ghost btn-xs"
                    onClick={() => void handleInheritAltitude()}
                    disabled={inheritPending}
                  >
                    <RefreshCw className="size-3" />
                    {t("maps.workspace.dataExplorer.edit.inheritTrail")}
                  </button>
                ) : null}
              </div>
            </div>
            <CoordinateTripleInput
              value={coordinates}
              onChange={setCoordinates}
              disabled={pending}
            />
          </section>

          {target.kind === "control-point" ? (
            <section className="grid grid-cols-2 gap-3">
              <label className="form-control gap-1">
                <span className="text-xs font-medium text-base-content/60">
                  {t("maps.workspace.dataExplorer.pole")}
                </span>
                <input
                  className="input-bordered input input-sm w-full"
                  value={poleNumber}
                  onChange={(event) => setPoleNumber(event.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="form-control gap-1">
                <span className="text-xs font-medium text-base-content/60">
                  {t("maps.workspace.dataExplorer.label")}
                </span>
                <input
                  className="input-bordered input input-sm w-full"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  disabled={pending}
                />
              </label>
            </section>
          ) : (
            <section className="space-y-3">
              <label className="form-control gap-1">
                <span className="text-xs font-medium text-base-content/60">
                  {t("maps.workspace.dataExplorer.name")}
                </span>
                <input
                  className="input-bordered input input-sm w-full"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={pending}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control gap-1">
                  <span className="text-xs font-medium text-base-content/60">ref</span>
                  <input
                    className="input-bordered input input-sm w-full font-mono"
                    value={ref}
                    onChange={(event) => setRef(event.target.value)}
                    disabled={pending}
                  />
                </label>
                <label className="form-control gap-1">
                  <span className="text-xs font-medium text-base-content/60">
                    {t("maps.workspace.dataExplorer.markerType")}
                  </span>
                  <select
                    className="select-bordered select w-full select-sm"
                    value={pointType}
                    onChange={(event) => setPointType(event.target.value as MapPointType)}
                    disabled={pending}
                  >
                    {MAP_POINT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}

          {saveError ? <p className="text-sm text-error">{saveError}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-base-content/10 bg-base-200/30 px-5 py-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={pending}
          >
            {t("maps.workspace.dataExplorer.edit.cancel")}
          </button>
          <button
            type="button"
            className="btn gap-1 btn-sm btn-primary"
            onClick={handleSave}
            disabled={pending}
            data-test="data-explorer-edit-save"
          >
            <Mountain className="size-3.5 opacity-80" />
            {pending
              ? t("maps.workspace.dataExplorer.edit.saving")
              : t("maps.workspace.dataExplorer.edit.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
