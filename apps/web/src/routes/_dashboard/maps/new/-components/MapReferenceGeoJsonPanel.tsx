import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  deleteMapReferenceGeoJsonMutationOptions,
  importMapReferenceGeoJsonMutationOptions,
  mapReferenceGeoJsonQueryOptions,
  setMapReferenceGeoJsonVisibilityMutationOptions,
} from "@/lib/reference-geojson/reference-geojson-query-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";

type MapReferenceGeoJsonPanelProps = {
  mapId: number;
};

export function MapReferenceGeoJsonPanel({ mapId }: MapReferenceGeoJsonPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localLayersQuery = useQuery(mapReferenceGeoJsonQueryOptions(mapId));
  const importMutation = useMutation(importMapReferenceGeoJsonMutationOptions(mapId));
  const deleteMutation = useMutation(deleteMapReferenceGeoJsonMutationOptions(mapId));
  const visibilityMutation = useMutation(setMapReferenceGeoJsonVisibilityMutationOptions(mapId));

  const localLayers = localLayersQuery.data ?? [];
  const visibleLocalCount = localLayers.filter((layer) => layer.visible).length;

  return (
    <div
      className="space-y-3 border-t border-base-content/10 pt-5"
      data-test="reference-geojson-panel"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Reference GeoJSON</h2>
        <p className="text-sm text-base-content/70">
          Import trail or boundary GeoJSON for overlay on the base map while you trace the PDF. In
          the desktop app, files are stored under user data on disk; in the web app, they stay in
          this browser only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Label
          htmlFor={`reference-geojson-upload-${mapId}`}
          className="btn cursor-pointer btn-outline btn-sm"
          data-test="reference-geojson-upload-label"
        >
          <Upload className="size-4" />
          Import GeoJSON
        </Label>
        <input
          ref={fileInputRef}
          id={`reference-geojson-upload-${mapId}`}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="sr-only"
          data-test="reference-geojson-upload-input"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) {
              return;
            }
            importMutation.mutate({ file });
          }}
        />
      </div>

      <p className="text-xs text-base-content/60">
        Supports FeatureCollection / Feature with LineString or MultiLineString. Not uploaded to the
        server.
      </p>

      {localLayers.length > 0 ? (
        <ul className="space-y-2" data-test="reference-geojson-layer-list">
          {localLayers.map((layer) => (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-3 rounded-md border border-base-content/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{layer.name}</p>
                <p className="text-xs text-base-content/60">
                  {layer.featureCount} lines · {layer.fileName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={layer.visible ? "default" : "outline"}
                  disabled={visibilityMutation.isPending}
                  onClick={() =>
                    visibilityMutation.mutate({ id: layer.id, visible: !layer.visible })
                  }
                  data-test={`reference-geojson-visibility-${layer.id}`}
                >
                  {layer.visible ? "Shown" : "Hidden"}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(layer.id)}
                  aria-label={`Remove ${layer.name}`}
                  data-test={`reference-geojson-delete-${layer.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/60" data-test="reference-geojson-empty">
          No imported reference GeoJSON yet.
        </p>
      )}

      <p className="text-xs text-base-content/60" data-test="reference-geojson-summary">
        {visibleLocalCount} layer{visibleLocalCount === 1 ? "" : "s"} visible on the map
      </p>
    </div>
  );
}
