import { useRef } from "react";
import { Layers, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { mergeReferenceGeoJsonCollections } from "@repo/isomorphic/reference-geojson";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

type MapReferenceGeoJsonSectionProps = {
  mapId: number;
  showReferenceOverlay: boolean;
  onShowReferenceOverlayChange: (visible: boolean) => void;
};

export function MapReferenceGeoJsonSection({
  mapId,
  showReferenceOverlay,
  onShowReferenceOverlayChange,
}: MapReferenceGeoJsonSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const layersQuery = useReferenceGeoJsonQuery(mapId);
  const importLayer = useIpcMutation("referenceGeoJson:import");
  const deleteLayer = useIpcMutation("referenceGeoJson:delete");
  const setVisibility = useIpcMutation("referenceGeoJson:setVisibility");

  const layers = layersQuery.data?.layers ?? [];
  const visibleFeatureCount =
    mergeReferenceGeoJsonCollections(
      layers.filter((layer) => layer.visible).map((layer) => layer.collection),
    )?.features.length ?? 0;

  return (
    <section className="flex flex-col gap-5 rounded-box bg-base-200/40 p-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("maps.workspace.referenceGeoJson.title")}
        </h3>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.workspace.referenceGeoJson.hint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={`reference-geojson-upload-${mapId}`}
          className="btn cursor-pointer btn-outline btn-sm"
        >
          <Upload className="size-4" />
          {t("maps.workspace.referenceGeoJson.import")}
        </label>
        <input
          ref={fileInputRef}
          id={`reference-geojson-upload-${mapId}`}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) {
              return;
            }
            void fileToBase64(file).then((fileBase64) =>
              importLayer.mutate({
                mapId,
                fileName: file.name,
                fileBase64,
              }),
            );
          }}
        />
        <button
          type="button"
          className={`btn btn-sm ${showReferenceOverlay ? "btn-primary" : "btn-outline"}`}
          disabled={visibleFeatureCount === 0}
          onClick={() => onShowReferenceOverlayChange(!showReferenceOverlay)}
        >
          <Layers className="size-4" />
          {showReferenceOverlay
            ? t("maps.workspace.referenceGeoJson.overlayOn", { count: visibleFeatureCount })
            : t("maps.workspace.referenceGeoJson.overlayOff")}
        </button>
      </div>

      {layers.length > 0 ? (
        <ul className="space-y-2">
          {layers.map((layer) => (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-base-content/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{layer.name}</p>
                <p className="text-xs text-base-content/60">
                  {layer.featureCount} lines · {layer.fileName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${layer.visible ? "btn-primary" : "btn-outline"}`}
                  disabled={setVisibility.isPending}
                  onClick={() =>
                    setVisibility.mutate({
                      mapId,
                      layerId: layer.id,
                      visible: !layer.visible,
                    })
                  }
                >
                  {layer.visible
                    ? t("maps.workspace.referenceGeoJson.shown")
                    : t("maps.workspace.referenceGeoJson.hidden")}
                </button>
                <button
                  type="button"
                  className="btn btn-square btn-outline btn-sm"
                  disabled={deleteLayer.isPending}
                  onClick={() =>
                    deleteLayer.mutate({
                      mapId,
                      layerId: layer.id,
                    })
                  }
                  aria-label={t("maps.workspace.referenceGeoJson.remove", { name: layer.name })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/60">{t("maps.workspace.referenceGeoJson.empty")}</p>
      )}
    </section>
  );
}
