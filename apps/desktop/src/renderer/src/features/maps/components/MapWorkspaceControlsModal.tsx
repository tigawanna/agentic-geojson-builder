import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { MapBaseMapStyle } from "@shared/maps.types";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useReplaceMapSourceMutation } from "@renderer/features/maps/hooks/useReplaceMapSourceMutation";
import { generateSourceThumbnail } from "@renderer/features/maps/lib/generate-source-thumbnail";
import { useTileCacheStatusQuery } from "@renderer/features/maps/hooks/useTileCacheStatusQuery";
import { useWorkspacePersistence } from "@renderer/features/maps/hooks/useWorkspacePersistence";
import { defaultPdfTransform } from "@renderer/features/maps/lib/pdf-view-transform";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import type { MapHandle } from "@renderer/features/maps/lib/map-handle";
import { BaseMapStylePicker } from "@renderer/features/maps/components/BaseMapStylePicker";

const acceptedTypes = "application/pdf,image/png,image/jpeg,image/webp";

type MapWorkspaceControlsModalProps = {
  mapHandle: MapHandle | null;
  controlPoints: ControlPointRecord[];
  selectedControlPointId: number | null;
  onFocusControlPoint: (point: ControlPointRecord) => void;
};

type ControlsSectionProps = {
  title: string;
  hint: string;
  children: ReactNode;
};

const softActionClass =
  "rounded-lg px-4 py-2 text-sm font-medium text-base-content/75 transition-colors hover:bg-base-content/10 hover:text-base-content";

function ControlsSection({ title, hint, children }: ControlsSectionProps) {
  return (
    <section className="flex flex-col gap-5 rounded-box bg-base-200/40 p-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-base-content/60">{hint}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function MapWorkspaceControlsModal({
  mapHandle,
  controlPoints,
  selectedControlPointId,
  onFocusControlPoint,
}: MapWorkspaceControlsModalProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const mapId = useMapWorkspaceState((state) => state.mapId);
  const isOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const closeControls = useMapWorkspaceUiActions().closeControls;
  const openTileCacheBounds = useMapWorkspaceUiActions().openTileCacheBounds;
  const setSelectedControlPointId = useMapWorkspaceUiActions().setSelectedControlPointId;
  const { queueSave } = useWorkspacePersistence();
  const replaceSource = useReplaceMapSourceMutation();
  const deleteControlPoint = useIpcMutation("controlPoints:delete");
  const tileCache = useTileCacheStatusQuery(mapId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [baseMapStyle, setBaseMapStyle] = useState<MapBaseMapStyle>("standard");
  const [pdfScale, setPdfScale] = useState(1);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace || !isOpen) {
      return;
    }

    setName(workspace.name);
    setDescription(workspace.description ?? "");
    setLocationQuery(workspace.locationQuery);
    setLatitude(workspace.mapCenterLat?.toString() ?? "");
    setLongitude(workspace.mapCenterLng?.toString() ?? "");
    setBaseMapStyle(workspace.baseMapStyle);
    setPdfScale(workspace.pdfScale);
    setPdfRotation(workspace.pdfRotation);
    setLocationError(null);
    setReplaceError(null);
  }, [isOpen, workspace]);

  if (!isOpen || !workspace || !mapId) {
    return null;
  }

  const currentMapId = mapId;

  function applyBaseMapStyle(style: MapBaseMapStyle) {
    setBaseMapStyle(style);
    queueSave({ baseMapStyle: style });
  }

  function applyPdfTransform(scale: number, rotation: number) {
    setPdfScale(scale);
    setPdfRotation(rotation);
    queueSave({ pdfScale: scale, pdfRotation: rotation });
  }

  function resetPdfView() {
    const reset = defaultPdfTransform();
    setPdfScale(reset.scale);
    setPdfRotation(reset.rotation);
    queueSave({
      pdfScale: reset.scale,
      pdfRotation: reset.rotation,
      pdfPanX: reset.panX,
      pdfPanY: reset.panY,
    });
  }

  async function handleLocationSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query || !mapHandle) {
      return;
    }

    setIsSearchingLocation(true);
    setLocationError(null);
    const result = await mapHandle.panToQuery(query);
    setIsSearchingLocation(false);

    if (result.error) {
      setLocationError(result.error);
      return;
    }

    queueSave({ locationQuery: query });
  }

  function applyPinCoordinates() {
    const parsedLat = latitude.trim() ? Number(latitude) : null;
    const parsedLng = longitude.trim() ? Number(longitude) : null;

    if (
      parsedLat !== null &&
      (!Number.isFinite(parsedLat) || parsedLng === null || !Number.isFinite(parsedLng))
    ) {
      setLocationError(t("maps.workspace.invalidCoordinates"));
      return;
    }

    if (parsedLat !== null && parsedLng !== null && mapHandle) {
      mapHandle.setViewport({ latitude: parsedLat, longitude: parsedLng, zoom: 14 });
    }

    setLocationError(null);
    queueSave({
      mapCenterLat: parsedLat,
      mapCenterLng: parsedLng,
      mapZoom: parsedLat !== null && parsedLng !== null ? 14 : null,
    });
  }

  function saveProjectDetails() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    queueSave({
      name: trimmedName,
      description: description.trim() || null,
    });
  }

  async function handleReplaceSource(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setReplaceError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const thumbnail = await generateSourceThumbnail(file);
      await replaceSource.mutateAsync({
        mapId: currentMapId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64,
        ...(thumbnail
          ? { thumbnailBase64: thumbnail.base64, thumbnailMimeType: thumbnail.mimeType }
          : {}),
      });
      resetPdfView();
    } catch (error) {
      setReplaceError(error instanceof Error ? error.message : t("maps.workspace.replaceError"));
    }
  }

  return (
    <div className="modal-open modal z-[1100]">
      <div className="modal-box max-h-[88vh] max-w-xl overflow-y-auto px-8 py-8 shadow-2xl">
        <button
          type="button"
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg text-base-content/55 transition-colors hover:bg-base-content/10 hover:text-base-content"
          onClick={closeControls}
          aria-label={t("maps.create.close")}
        >
          ✕
        </button>

        <div className="flex flex-col gap-8 pr-2">
          <div className="space-y-2 pr-8">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("maps.workspace.controlsTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-base-content/60">
              {t("maps.workspace.controlsDescription")}
            </p>
          </div>

          <ControlsSection
            title={t("maps.workspace.mapSection")}
            hint={t("maps.workspace.mapSectionHint")}
          >
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => void handleLocationSearch(event)}
            >
              <input
                className="input-bordered input min-w-0 flex-1"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder={t("maps.create.locationPlaceholder")}
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-content transition-opacity hover:opacity-90 disabled:opacity-40 sm:min-w-24"
                disabled={isSearchingLocation || locationQuery.trim().length === 0}
              >
                {isSearchingLocation ? t("maps.workspace.searching") : t("maps.workspace.search")}
              </button>
            </form>
            {locationError ? <p className="text-sm text-error">{locationError}</p> : null}

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
                Base map
              </span>
              <BaseMapStylePicker value={baseMapStyle} onChange={applyBaseMapStyle} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control gap-2.5">
                <span className="label-text font-medium">{t("maps.create.latitudeLabel")}</span>
                <input
                  className="input-bordered input w-full"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="form-control gap-2.5">
                <span className="label-text font-medium">{t("maps.create.longitudeLabel")}</span>
                <input
                  className="input-bordered input w-full"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>

            <button
              type="button"
              className={`${softActionClass} w-full sm:w-auto`}
              onClick={applyPinCoordinates}
            >
              {t("maps.workspace.applyCoordinates")}
            </button>
          </ControlsSection>

          <ControlsSection
            title={t("maps.workspace.pdfSection")}
            hint={t("maps.workspace.pdfSectionHint")}
          >
            <label className="form-control gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="label-text font-medium">{t("maps.workspace.pdfScale")}</span>
                <span className="font-mono text-xs text-base-content/60">
                  {pdfScale.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={5}
                step={0.05}
                value={pdfScale}
                onChange={(event) => applyPdfTransform(Number(event.target.value), pdfRotation)}
                className="range range-primary"
              />
            </label>

            <label className="form-control gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="label-text font-medium">{t("maps.workspace.pdfRotation")}</span>
                <span className="font-mono text-xs text-base-content/60">{pdfRotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={pdfRotation}
                onChange={(event) => applyPdfTransform(pdfScale, Number(event.target.value))}
                className="range range-primary"
              />
            </label>

            <button
              type="button"
              className={`${softActionClass} w-full sm:w-auto`}
              onClick={resetPdfView}
            >
              {t("maps.workspace.resetPdfView")}
            </button>
          </ControlsSection>

          <ControlsSection
            title={t("maps.workspace.referencesSection")}
            hint={t("maps.workspace.referencesSectionHint")}
          >
            {controlPoints.length === 0 ? (
              <p className="rounded-box border border-dashed border-base-content/15 px-4 py-6 text-center text-sm text-base-content/60">
                {t("maps.workspace.referencesEmpty")}
              </p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                {controlPoints.map((point, index) => (
                  <li
                    key={point.id}
                    className={`flex items-start justify-between gap-4 rounded-box px-4 py-3 transition-colors ${
                      selectedControlPointId === point.id
                        ? "bg-primary/15 ring-1 ring-primary/40"
                        : "bg-base-100/40"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 space-y-1 text-left text-sm transition-colors hover:text-base-content"
                      title={t("maps.workspace.focusReference")}
                      onClick={() => onFocusControlPoint(point)}
                    >
                      <p className="font-medium">
                        {point.label ?? t("maps.workspace.referenceItem", { index: index + 1 })}
                      </p>
                      <p className="font-mono text-xs text-base-content/60">
                        PDF ({point.imageX.toFixed(1)}, {point.imageY.toFixed(1)})
                      </p>
                      <p className="font-mono text-xs text-base-content/60">
                        Map ({point.latitude.toFixed(5)}, {point.longitude.toFixed(5)})
                      </p>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-error"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteControlPoint
                          .mutateAsync({
                            mapId: currentMapId,
                            controlPointId: point.id,
                          })
                          .then(() => {
                            if (selectedControlPointId === point.id) {
                              setSelectedControlPointId(null);
                            }
                          });
                      }}
                    >
                      {t("maps.workspace.deleteReference")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ControlsSection>

          <ControlsSection
            title={t("maps.workspace.tileCacheSection")}
            hint={t("maps.workspace.tileCacheSectionHint")}
          >
            <p className="rounded-box bg-base-100/40 px-4 py-3 text-sm text-base-content/70">
              {tileCache.data?.builtAt
                ? `${tileCache.data.tileCount.toLocaleString()} tiles cached · ${tileCache.data.style}`
                : t("maps.workspace.tileCacheMissing")}
            </p>

            <button
              type="button"
              className={`${softActionClass} w-full sm:w-auto`}
              onClick={openTileCacheBounds}
            >
              {t("maps.workspace.configureTileCache")}
            </button>
          </ControlsSection>

          <ControlsSection
            title={t("maps.workspace.projectSection")}
            hint={t("maps.workspace.projectSectionHint")}
          >
            <label className="form-control gap-2.5">
              <span className="label-text font-medium">{t("maps.create.nameLabel")}</span>
              <input
                className="input-bordered input w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={saveProjectDetails}
              />
            </label>

            <label className="form-control gap-2.5">
              <span className="label-text font-medium">{t("maps.create.descriptionLabel")}</span>
              <textarea
                className="textarea-bordered textarea min-h-24 w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={saveProjectDetails}
                rows={3}
              />
            </label>

            <label className="flex cursor-pointer flex-col gap-2.5">
              <span className="label-text font-medium">{t("maps.workspace.replaceSource")}</span>
              <input
                type="file"
                accept={acceptedTypes}
                className="file-input-bordered file-input w-full"
                onChange={(event) => void handleReplaceSource(event)}
              />
            </label>
            {replaceError ? <p className="text-sm text-error">{replaceError}</p> : null}
          </ControlsSection>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={closeControls} aria-hidden />
    </div>
  );
}
