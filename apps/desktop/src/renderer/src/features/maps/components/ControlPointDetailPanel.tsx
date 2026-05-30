import { useEffect, useState } from "react";
import { ImagePlus, MapPin, Mountain, RefreshCw, Tag, Trash2, X } from "lucide-react";
import type {
  ControlPointAttachmentRecord,
  ControlPointContextSnapshot,
  ControlPointRecord,
} from "@shared/control-points.types";
import { useIpcMutation, useIpcQuery } from "@renderer/hooks/useIpc";
import { useQueryClient } from "@tanstack/react-query";

type ControlPointDetailPanelProps = {
  controlPoint: ControlPointRecord;
  mapId: number;
  onClose: () => void;
  onUpdated: (updated: ControlPointRecord) => void;
  onInheritFromTrail: (controlPointId: number) => void;
};

export function ControlPointDetailPanel({
  controlPoint,
  mapId,
  onClose,
  onUpdated,
  onInheritFromTrail,
}: ControlPointDetailPanelProps) {
  const queryClient = useQueryClient();
  const updateMutation = useIpcMutation("controlPoints:update");
  const pickAttachmentMutation = useIpcMutation("controlPoints:pickAttachmentFile");
  const removeAttachmentMutation = useIpcMutation("controlPoints:removeAttachment");

  const attachmentsQuery = useIpcQuery(
    "controlPoints:listAttachments",
    { controlPointId: controlPoint.id },
    { enabled: true },
  );

  const [label, setLabel] = useState(controlPoint.label ?? "");
  const [poleNumber, setPoleNumber] = useState(controlPoint.poleNumber ?? "");
  const [description, setDescription] = useState(controlPoint.description ?? "");
  const [latitude, setLatitude] = useState(controlPoint.latitude.toFixed(6));
  const [longitude, setLongitude] = useState(controlPoint.longitude.toFixed(6));
  const [altitudeM, setAltitudeM] = useState(
    controlPoint.altitudeM != null ? String(controlPoint.altitudeM) : "",
  );
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(controlPoint.label ?? "");
    setPoleNumber(controlPoint.poleNumber ?? "");
    setDescription(controlPoint.description ?? "");
    setLatitude(controlPoint.latitude.toFixed(6));
    setLongitude(controlPoint.longitude.toFixed(6));
    setAltitudeM(controlPoint.altitudeM != null ? String(controlPoint.altitudeM) : "");
    setDirty(false);
    setSaveError(null);
  }, [controlPoint]);

  function markDirty() {
    setDirty(true);
    setSaveError(null);
  }

  function handleSave() {
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setSaveError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setSaveError("Longitude must be between -180 and 180.");
      return;
    }

    const parsedAlt = altitudeM.trim() ? Number(altitudeM) : null;
    if (parsedAlt !== null && !Number.isFinite(parsedAlt)) {
      setSaveError("Altitude must be a valid number.");
      return;
    }

    updateMutation.mutate(
      {
        mapId,
        controlPointId: controlPoint.id,
        imageX: controlPoint.imageX,
        imageY: controlPoint.imageY,
        latitude: parsedLat,
        longitude: parsedLng,
        label: label.trim() || null,
        poleNumber: poleNumber.trim() || null,
        description: description.trim() || null,
        altitudeM: parsedAlt,
      },
      {
        onSuccess: ({ controlPoint: updated }) => {
          setDirty(false);
          onUpdated(updated);
        },
        onError: (error) => {
          setSaveError(error.message);
        },
      },
    );
  }

  function handlePickAttachment() {
    pickAttachmentMutation.mutate(
      { controlPointId: controlPoint.id },
      {
        onSuccess: (result) => {
          if ("attachment" in result) {
            void queryClient.invalidateQueries({
              queryKey: ["controlPoints:listAttachments"],
            });
          }
        },
      },
    );
  }

  function handleRemoveAttachment(attachmentId: number) {
    removeAttachmentMutation.mutate(
      { attachmentId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: ["controlPoints:listAttachments"],
          });
        },
      },
    );
  }

  const attachments: ControlPointAttachmentRecord[] = attachmentsQuery.data?.attachments ?? [];
  const snapshot: ControlPointContextSnapshot | null = controlPoint.contextSnapshot;

  return (
    <aside className="flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden border-l border-base-300 bg-base-100/95 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">
            {controlPoint.poleNumber ?? controlPoint.label ?? `Reference #${controlPoint.id}`}
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
            Details
          </h3>

          <label className="form-control w-full">
            <div className="label py-0.5">
              <span className="label-text text-xs">Pole / Reference Number</span>
            </div>
            <input
              type="text"
              className="input-bordered input input-sm w-full"
              placeholder="e.g. 19"
              value={poleNumber}
              onChange={(e) => {
                setPoleNumber(e.target.value);
                markDirty();
              }}
            />
          </label>

          <label className="form-control w-full">
            <div className="label py-0.5">
              <span className="label-text text-xs">Label</span>
            </div>
            <input
              type="text"
              className="input-bordered input input-sm w-full"
              placeholder="Display name"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                markDirty();
              }}
            />
          </label>

          <label className="form-control w-full">
            <div className="label py-0.5">
              <span className="label-text text-xs">Description</span>
            </div>
            <textarea
              className="textarea-bordered textarea w-full textarea-sm leading-snug"
              rows={3}
              placeholder="Notes about this location..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
            />
          </label>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
            GPS Location
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <label className="form-control">
              <div className="label py-0.5">
                <span className="label-text text-xs">Latitude</span>
              </div>
              <input
                type="text"
                className="input-bordered input input-sm w-full font-mono text-xs"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  markDirty();
                }}
              />
            </label>
            <label className="form-control">
              <div className="label py-0.5">
                <span className="label-text text-xs">Longitude</span>
              </div>
              <input
                type="text"
                className="input-bordered input input-sm w-full font-mono text-xs"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  markDirty();
                }}
              />
            </label>
          </div>

          <label className="form-control w-full">
            <div className="label py-0.5">
              <span className="label-text text-xs">Altitude (meters)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mountain className="size-3.5 shrink-0 text-base-content/50" />
              <input
                type="text"
                className="input-bordered input input-sm flex-1 font-mono text-xs"
                placeholder="—"
                value={altitudeM}
                onChange={(e) => {
                  setAltitudeM(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </label>

          <p className="text-[10px] leading-relaxed text-base-content/40">
            PDF pixel: ({controlPoint.imageX.toFixed(1)}, {controlPoint.imageY.toFixed(1)})
          </p>
        </section>

        {snapshot ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
              Inherited Context
            </h3>
            <div className="space-y-1.5 rounded-box border border-base-300 bg-base-200/50 p-3">
              <p className="text-xs">
                <span className="text-base-content/60">Source:</span>{" "}
                <span className="font-medium">{snapshot.source.name ?? "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-base-content/60">Distance:</span>{" "}
                {snapshot.distanceMeters.toFixed(1)} m
              </p>
              {snapshot.position.altitudeM != null ? (
                <p className="text-xs">
                  <span className="text-base-content/60">Trail altitude:</span>{" "}
                  {snapshot.position.altitudeM.toFixed(1)} m
                </p>
              ) : null}
              {snapshot.source.pathKind ? (
                <span className="badge badge-outline badge-xs">{snapshot.source.pathKind}</span>
              ) : null}
              <p className="text-[10px] text-base-content/40">
                Captured: {new Date(snapshot.capturedAt).toLocaleString()}
              </p>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
              Trail Context
            </h3>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              onClick={() => onInheritFromTrail(controlPoint.id)}
            >
              <RefreshCw className="size-3" />
              {snapshot ? "Refresh" : "Inherit"}
            </button>
          </div>
          {!snapshot ? (
            <p className="text-xs text-base-content/50">
              No trail context yet. Click &quot;Inherit&quot; to capture properties from the nearest
              point on a visible trail (within 100 m). Altitude is interpolated on that trail when
              the reference GeoJSON includes elevation.
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
              Photos
            </h3>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              onClick={handlePickAttachment}
              disabled={pickAttachmentMutation.isPending}
            >
              <ImagePlus className="size-3" />
              Add
            </button>
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-base-content/50">No photos attached yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-base-300"
                >
                  <img
                    src={`file://${attachment.filePath}`}
                    alt={attachment.caption ?? "Attachment"}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    className="btn absolute top-0.5 right-0.5 btn-circle bg-base-100/80 opacity-0 transition-opacity btn-xs group-hover:opacity-100"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                  >
                    <Trash2 className="size-3 text-error" />
                  </button>
                  {attachment.caption ? (
                    <div className="absolute inset-x-0 bottom-0 bg-base-100/70 px-1 py-0.5">
                      <p className="truncate text-[10px]">{attachment.caption}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {controlPoint.metadata && Object.keys(controlPoint.metadata).length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
              <Tag className="mr-1 inline size-3" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(controlPoint.metadata).map(([key, value]) => (
                <span key={key} className="badge badge-outline badge-sm font-normal">
                  {key}: {value}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t border-base-300 px-4 py-3">
        {saveError ? <p className="text-xs text-error">{saveError}</p> : null}
        <button
          type="button"
          className="btn w-full btn-sm btn-primary"
          disabled={!dirty || updateMutation.isPending}
          onClick={handleSave}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </aside>
  );
}
