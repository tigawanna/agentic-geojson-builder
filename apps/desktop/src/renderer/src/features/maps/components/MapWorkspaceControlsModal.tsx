import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";
import { useReplaceMapSourceMutation } from "../hooks/useReplaceMapSourceMutation";
import { generateSourceThumbnail } from "../lib/generate-source-thumbnail";
import { useTileCacheStatusQuery } from "../hooks/useTileCacheStatusQuery";
import { useWorkspacePersistence } from "../hooks/useWorkspacePersistence";
import { defaultPdfTransform } from "../lib/pdf-view-transform";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "../store/MapWorkspaceProvider";
import type { MapHandle } from "../lib/map-handle";

const acceptedTypes = "application/pdf,image/png,image/jpeg,image/webp";

type MapWorkspaceControlsModalProps = {
  mapHandle: MapHandle | null;
};

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function MapWorkspaceControlsModal({ mapHandle }: MapWorkspaceControlsModalProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const mapId = useMapWorkspaceState((state) => state.mapId);
  const isOpen = useMapWorkspaceUiState((state) => state.controlsOpen);
  const closeControls = useMapWorkspaceUiActions().closeControls;
  const openTileCacheBounds = useMapWorkspaceUiActions().openTileCacheBounds;
  const { queueSave } = useWorkspacePersistence();
  const replaceSource = useReplaceMapSourceMutation();
  const tileCache = useTileCacheStatusQuery(mapId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [baseMapStyle, setBaseMapStyle] = useState<MapBaseMapStyle>("satellite");
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
    <div className="modal-open modal">
      <div className="modal-box max-h-[85vh] max-w-lg overflow-y-auto px-8 py-8">
        <button
          type="button"
          className="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
          onClick={closeControls}
          aria-label={t("maps.create.close")}
        >
          ✕
        </button>

        <div className="flex flex-col gap-8 pr-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("maps.workspace.controlsTitle")}</h2>
            <p className="text-sm leading-relaxed text-base-content/60">
              {t("maps.workspace.controlsDescription")}
            </p>
          </div>

          <section className="flex flex-col gap-4 border-t border-base-content/10 pt-6">
            <div>
              <h3 className="text-sm font-semibold">{t("maps.workspace.projectSection")}</h3>
              <p className="mt-1 text-sm text-base-content/60">
                {t("maps.workspace.projectSectionHint")}
              </p>
            </div>

            <label className="form-control gap-2">
              <span className="label-text">{t("maps.create.nameLabel")}</span>
              <input
                className="input-bordered input w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={saveProjectDetails}
              />
            </label>

            <label className="form-control gap-2">
              <span className="label-text">{t("maps.create.descriptionLabel")}</span>
              <textarea
                className="textarea-bordered textarea min-h-20 w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={saveProjectDetails}
                rows={2}
              />
            </label>

            <label className="flex cursor-pointer flex-col gap-2">
              <span className="label-text">{t("maps.workspace.replaceSource")}</span>
              <input
                type="file"
                accept={acceptedTypes}
                className="file-input-bordered file-input w-full"
                onChange={(event) => void handleReplaceSource(event)}
              />
            </label>
            {replaceError ? <p className="text-sm text-error">{replaceError}</p> : null}
          </section>

          <section className="flex flex-col gap-4 border-t border-base-content/10 pt-6">
            <div>
              <h3 className="text-sm font-semibold">{t("maps.workspace.tileCacheSection")}</h3>
              <p className="mt-1 text-sm text-base-content/60">
                {t("maps.workspace.tileCacheSectionHint")}
              </p>
            </div>

            <p className="text-sm text-base-content/70">
              {tileCache.data?.builtAt
                ? `${tileCache.data.tileCount.toLocaleString()} tiles cached · ${tileCache.data.style}`
                : t("maps.workspace.tileCacheMissing")}
            </p>

            <button type="button" className="btn btn-outline btn-sm" onClick={openTileCacheBounds}>
              {t("maps.workspace.configureTileCache")}
            </button>
          </section>

          <section className="flex flex-col gap-4 border-t border-base-content/10 pt-6">
            <div>
              <h3 className="text-sm font-semibold">{t("maps.workspace.mapSection")}</h3>
              <p className="mt-1 text-sm text-base-content/60">
                {t("maps.workspace.mapSectionHint")}
              </p>
            </div>

            <form className="flex gap-2" onSubmit={(event) => void handleLocationSearch(event)}>
              <input
                className="input-bordered input min-w-0 flex-1"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder={t("maps.create.locationPlaceholder")}
              />
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={isSearchingLocation || locationQuery.trim().length === 0}
              >
                {isSearchingLocation ? t("maps.workspace.searching") : t("maps.workspace.search")}
              </button>
            </form>
            {locationError ? <p className="text-sm text-error">{locationError}</p> : null}

            <div className="flex flex-wrap gap-2">
              {(["satellite", "outline", "standard"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`btn btn-sm ${baseMapStyle === style ? "btn-primary" : "btn-outline"}`}
                  onClick={() => applyBaseMapStyle(style)}
                >
                  {t(`maps.workspace.baseMap.${style}`)}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control gap-2">
                <span className="label-text">{t("maps.create.latitudeLabel")}</span>
                <input
                  className="input-bordered input w-full"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="form-control gap-2">
                <span className="label-text">{t("maps.create.longitudeLabel")}</span>
                <input
                  className="input-bordered input w-full"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>

            <button type="button" className="btn btn-outline btn-sm" onClick={applyPinCoordinates}>
              {t("maps.workspace.applyCoordinates")}
            </button>
          </section>

          <section className="flex flex-col gap-4 border-t border-base-content/10 pt-6">
            <div>
              <h3 className="text-sm font-semibold">{t("maps.workspace.pdfSection")}</h3>
              <p className="mt-1 text-sm text-base-content/60">
                {t("maps.workspace.pdfSectionHint")}
              </p>
            </div>

            <label className="form-control gap-2">
              <span className="label-text">{t("maps.workspace.pdfScale")}</span>
              <input
                type="range"
                min={0.25}
                max={5}
                step={0.05}
                value={pdfScale}
                onChange={(event) => applyPdfTransform(Number(event.target.value), pdfRotation)}
                className="range range-primary range-sm"
              />
              <span className="text-xs text-base-content/50">{pdfScale.toFixed(2)}×</span>
            </label>

            <label className="form-control gap-2">
              <span className="label-text">{t("maps.workspace.pdfRotation")}</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={pdfRotation}
                onChange={(event) => applyPdfTransform(pdfScale, Number(event.target.value))}
                className="range range-primary range-sm"
              />
              <span className="text-xs text-base-content/50">{pdfRotation}°</span>
            </label>

            <button type="button" className="btn btn-outline btn-sm" onClick={resetPdfView}>
              {t("maps.workspace.resetPdfView")}
            </button>
          </section>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={closeControls} aria-hidden />
    </div>
  );
}
