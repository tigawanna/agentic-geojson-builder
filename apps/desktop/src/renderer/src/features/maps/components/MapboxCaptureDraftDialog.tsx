import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  MAPBOX_CAPTURE_DESCRIPTION_TAG,
  type CreateMapboxGroundCaptureInput,
} from "@shared/mapbox-capture.types";

type MapboxCaptureDraftDialogProps = {
  draft: CreateMapboxGroundCaptureInput | null;
  savePending: boolean;
  onClose: () => void;
  onSave: (input: CreateMapboxGroundCaptureInput) => void;
};

function tagEntriesFromDraft(draft: CreateMapboxGroundCaptureInput): [string, string][] {
  return Object.entries(draft.tags ?? {})
    .filter(([key]) => key !== MAPBOX_CAPTURE_DESCRIPTION_TAG)
    .sort(([a], [b]) => a.localeCompare(b));
}

function parseElevationInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatElevationInput(elevation: number | null | undefined): string {
  if (elevation == null || !Number.isFinite(elevation)) {
    return "";
  }
  return String(elevation);
}

export function MapboxCaptureDraftDialog({
  draft,
  savePending,
  onClose,
  onSave,
}: MapboxCaptureDraftDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [elevationInput, setElevationInput] = useState("");
  const [tagEntries, setTagEntries] = useState<[string, string][]>([]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    setTitle(draft.title);
    setDescription(draft.description?.trim() ?? "");
    setElevationInput(formatElevationInput(draft.elevation));
    setTagEntries(tagEntriesFromDraft(draft));
  }, [draft]);

  if (!draft) {
    return null;
  }

  function handleSave() {
    if (!draft) {
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    const tags = Object.fromEntries(
      tagEntries
        .map(([key, value]) => [key.trim(), value.trim()] as const)
        .filter(([key, value]) => key.length > 0 && value.length > 0),
    );
    onSave({
      title: trimmedTitle,
      description: description.trim() || null,
      tags,
      latitude: draft.latitude,
      longitude: draft.longitude,
      elevation: parseElevationInput(elevationInput),
      layerId: draft.layerId,
      sourceLayer: draft.sourceLayer,
      baseMapStyle: draft.baseMapStyle,
    });
  }

  function updateTagValue(index: number, value: string) {
    setTagEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? [entry[0], value] : entry)),
    );
  }

  return (
    <div className="modal-open modal z-1400" data-test="mapbox-capture-draft-dialog">
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t("mapboxViewer.captureDialog.close")}
        onClick={onClose}
      />
      <div className="modal-box flex max-h-[min(32rem,90vh)] max-w-lg flex-col gap-0 p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">{t("mapboxViewer.captureDialog.title")}</h2>
            <p className="mt-1 text-sm text-base-content/60">
              {t("mapboxViewer.captureDialog.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-circle shrink-0 btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t("mapboxViewer.captureDialog.close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("mapboxViewer.captureDialog.name")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-test="mapbox-capture-draft-title"
            />
          </label>

          <div className="rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5">
            <p className="text-xs font-medium text-base-content/50">
              {t("mapboxViewer.captureDialog.location")}
            </p>
            <p className="mt-1 font-mono text-sm">
              {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
            </p>
            {draft.layerId || draft.sourceLayer ? (
              <p className="mt-1 text-xs text-base-content/55">
                {[draft.layerId, draft.sourceLayer].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("mapboxViewer.captureDialog.altitude")}
            </span>
            <div className="join w-full">
              <input
                type="text"
                inputMode="decimal"
                className="input-bordered input input-sm join-item w-full font-mono"
                value={elevationInput}
                onChange={(event) => setElevationInput(event.target.value)}
                placeholder={t("mapboxViewer.captureDialog.altitudePlaceholder")}
                data-test="mapbox-capture-draft-altitude"
              />
              <span className="btn btn-disabled join-item px-3 text-xs text-base-content/50 btn-sm">
                m
              </span>
            </div>
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("mapboxViewer.captureDialog.description")}
            </span>
            <textarea
              className="textarea-bordered textarea min-h-20 w-full textarea-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("mapboxViewer.captureDialog.descriptionPlaceholder")}
              data-test="mapbox-capture-draft-description"
            />
          </label>

          {tagEntries.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-base-content/60">
                {t("mapboxViewer.captureDialog.properties")}
              </p>
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-base-300 p-2">
                {tagEntries.map(([key, value], index) => (
                  <li key={key} className="grid grid-cols-[7rem_1fr] items-center gap-2">
                    <span className="truncate font-mono text-[11px] text-base-content/55">
                      {key}
                    </span>
                    <input
                      type="text"
                      className="input-bordered input input-xs w-full font-mono"
                      value={value}
                      onChange={(event) => updateTagValue(index, event.target.value)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-base-content/50">
              {t("mapboxViewer.captureDialog.noProperties")}
            </p>
          )}
        </div>

        <div className="modal-action border-t border-base-300 px-6 py-4">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t("mapboxViewer.captureDialog.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={savePending || !title.trim()}
            onClick={handleSave}
            data-test="mapbox-capture-draft-save"
          >
            {savePending
              ? t("mapboxViewer.captureDialog.saving")
              : t("mapboxViewer.captureDialog.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
