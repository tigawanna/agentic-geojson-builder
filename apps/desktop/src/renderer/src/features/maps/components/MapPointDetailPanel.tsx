import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  MAP_POINT_CATEGORIES,
  MAP_POINT_NODE_ROLES,
  type MapPointCategory,
  type MapPointNodeRole,
  type MapPointRecord,
} from "@shared/map-points.types";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import {
  MapMarkerNeighborsSection,
  type MapMarkerNeighborsSectionHandle,
} from "@renderer/features/maps/components/MapMarkerNeighborsSection";
import { useMapWorkspaceUiActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapPointDetailPanelProps = {
  point: MapPointRecord;
  mapId: number;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  onClose: () => void;
};

export function MapPointDetailPanel({
  point,
  mapId,
  mapPoints,
  markerNeighbors,
  onClose,
}: MapPointDetailPanelProps) {
  const { t } = useTranslation();
  const { setStatusMessage } = useMapWorkspaceUiActions();
  const updatePoint = useIpcMutation("mapPoints:update");
  const deletePoint = useIpcMutation("mapPoints:delete");
  const neighborsRef = useRef<MapMarkerNeighborsSectionHandle>(null);
  const [saving, setSaving] = useState(false);

  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MapPointCategory>("custom");
  const [nodeRole, setNodeRole] = useState<MapPointNodeRole | "">("");
  const [elevation, setElevation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRef(point.ref ?? "");
    setName(point.name ?? "");
    setCategory(point.category);
    setNodeRole(point.nodeRole ?? "");
    setElevation(point.elevation !== null ? String(point.elevation) : "");
    setDescription(point.description ?? "");
    setError(null);
  }, [point]);

  async function handleSave() {
    setError(null);
    const parsedElevation = elevation.trim() === "" ? null : Number(elevation);
    if (parsedElevation !== null && !Number.isFinite(parsedElevation)) {
      setError("Elevation must be a number.");
      return;
    }

    setSaving(true);
    try {
      await updatePoint.mutateAsync({
        mapId,
        pointId: point.id,
        ref: ref.trim() || null,
        name: name.trim() || null,
        category,
        nodeRole: nodeRole === "" ? null : nodeRole,
        elevation: parsedElevation,
        elevationSource: parsedElevation !== null ? "manual" : null,
        description: description.trim() || null,
      });
      await neighborsRef.current?.saveIfDirty();
      setStatusMessage(
        t("maps.workspace.markerUpdated", {
          name: name.trim() || ref.trim() || resolveMapPointLinkRef(point),
        }),
      );
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-base-100">
      <div className="flex items-center justify-between border-b border-base-content/10 px-4 py-3">
        <h3 className="text-sm font-semibold">Marker</h3>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Ref (join key)</span>
          <input
            className="input-bordered input input-sm w-full font-mono"
            placeholder="13B"
            value={ref}
            onChange={(event) => setRef(event.target.value)}
          />
        </label>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Name</span>
          <input
            className="input-bordered input input-sm w-full"
            placeholder="Junction 13B"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Category</span>
          <select
            className="select-bordered select w-full select-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value as MapPointCategory)}
          >
            {MAP_POINT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Node role (routing)</span>
          <select
            className="select-bordered select w-full select-sm"
            value={nodeRole}
            onChange={(event) => setNodeRole(event.target.value as MapPointNodeRole | "")}
            data-test="map-point-node-role"
          >
            <option value="">—</option>
            {MAP_POINT_NODE_ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Elevation (m)</span>
          <input
            className="input-bordered input input-sm w-full"
            placeholder="1680"
            value={elevation}
            onChange={(event) => setElevation(event.target.value)}
          />
        </label>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium">Description</span>
          <textarea
            className="textarea-bordered textarea w-full textarea-sm"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <MapMarkerNeighborsSection
          ref={neighborsRef}
          mapId={mapId}
          point={point}
          mapPoints={mapPoints}
          neighbors={markerNeighbors}
          compact
          hideSaveButton
        />

        <p className="font-mono text-xs text-base-content/50">
          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
        </p>

        {error ? <p className="text-xs text-error">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-base-content/10 px-4 py-3">
        <button
          type="button"
          className="btn text-error btn-ghost btn-sm"
          disabled={deletePoint.isPending}
          onClick={() => {
            void deletePoint.mutateAsync({ mapId, pointId: point.id }).then(onClose);
          }}
        >
          <Trash2 className="size-4" />
          Delete
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={updatePoint.isPending || saving}
          onClick={() => void handleSave()}
          data-test="map-point-save"
        >
          Save
        </button>
      </div>
    </div>
  );
}
