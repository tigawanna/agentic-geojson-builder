import { useState } from "react";
import { Layers, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { mergeReferenceGeoJsonCollections } from "@repo/isomorphic/reference-geojson";
import { ipcInvoke, useIpcMutation } from "@renderer/hooks/useIpc";
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

function isGeoJsonFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".geojson") || lowerName.endsWith(".json");
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
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const layersQuery = useReferenceGeoJsonQuery(mapId);
  const importLayer = useIpcMutation("referenceGeoJson:import");
  const deleteLayer = useIpcMutation("referenceGeoJson:delete");
  const setVisibility = useIpcMutation("referenceGeoJson:setVisibility");

  const layers = layersQuery.data?.layers ?? [];
  const visibleFeatureCount =
    mergeReferenceGeoJsonCollections(
      layers.filter((layer) => layer.visible).map((layer) => layer.collection),
    )?.features.length ?? 0;

  async function importDroppedFiles(files: File[]) {
    const geoJsonFiles = files.filter(isGeoJsonFile);
    if (geoJsonFiles.length === 0) {
      setImportError(t("maps.workspace.referenceGeoJson.invalidDrop"));
      return;
    }

    setIsImporting(true);
    setImportError(null);

    const failures: string[] = [];
    let importedCount = 0;

    for (const file of geoJsonFiles) {
      try {
        const fileBase64 = await fileToBase64(file);
        await importLayer.mutateAsync({
          mapId,
          fileName: file.name,
          fileBase64,
        });
        importedCount += 1;
      } catch (error) {
        failures.push(
          `${file.name}: ${error instanceof Error ? error.message : t("maps.workspace.referenceGeoJson.importError")}`,
        );
      }
    }

    setIsImporting(false);

    if (importedCount === 0) {
      setImportError(failures.join("\n") || t("maps.workspace.referenceGeoJson.importError"));
      return;
    }

    if (failures.length > 0) {
      setImportError(failures.join("\n"));
    }
  }

  async function openFilePicker() {
    setImportError(null);
    setIsImporting(true);

    try {
      const result = await ipcInvoke("referenceGeoJson:pickAndImport", { mapId });
      if (result.canceled) {
        return;
      }

      if (result.failed.length > 0) {
        setImportError(result.failed.map((entry) => `${entry.name}: ${entry.error}`).join("\n"));
      }
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : t("maps.workspace.referenceGeoJson.importError"),
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section
      className={`flex flex-col gap-5 rounded-box bg-base-200/40 p-6 transition-colors ${
        isDragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-base-200" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const files = [...event.dataTransfer.files];
        if (files.length === 0) {
          return;
        }
        void importDroppedFiles(files);
      }}
    >
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("maps.workspace.referenceGeoJson.title")}
        </h3>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.workspace.referenceGeoJson.hint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isImporting || importLayer.isPending}
          onClick={() => void openFilePicker()}
        >
          <Upload className="size-4" />
          {isImporting || importLayer.isPending
            ? t("maps.workspace.referenceGeoJson.importing")
            : t("maps.workspace.referenceGeoJson.import")}
        </button>
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

      {importError ? <p className="text-sm whitespace-pre-wrap text-error">{importError}</p> : null}

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
