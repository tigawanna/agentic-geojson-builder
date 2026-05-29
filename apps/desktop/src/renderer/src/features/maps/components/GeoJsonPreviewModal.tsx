import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, X } from "lucide-react";
import { useIpcMutation } from "@renderer/hooks/useIpc";

type GeoJsonPreviewModalProps = {
  mapId: number;
  open: boolean;
  onClose: () => void;
};

const MAX_PREVIEW_FEATURES = 200;
const CHUNK_SIZE = 50;

export function GeoJsonPreviewModal({ mapId, open, onClose }: GeoJsonPreviewModalProps) {
  const exportMutation = useIpcMutation("geoSegments:export");
  const exportToFileMutation = useIpcMutation("geoSegments:exportToFile");
  const [previewJson, setPreviewJson] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setPreviewJson(null);
      setRenderedLines([]);
      setFeatureCount(0);
      return;
    }

    void exportMutation.mutateAsync({ mapId, mergeGroups: true }).then((result) => {
      setFeatureCount(result.featureCount);
      const truncated =
        result.geojson.features.length > MAX_PREVIEW_FEATURES
          ? {
              ...result.geojson,
              features: result.geojson.features.slice(0, MAX_PREVIEW_FEATURES),
            }
          : result.geojson;
      const json = JSON.stringify(truncated, null, 2);
      setPreviewJson(json);
    });
  }, [open, mapId]);

  useEffect(() => {
    if (!previewJson) {
      setRenderedLines([]);
      return;
    }

    const lines = previewJson.split("\n");
    renderingRef.current = true;
    setRenderedLines([]);

    let index = 0;
    function renderChunk() {
      if (!renderingRef.current) return;
      const chunk = lines.slice(index, index + CHUNK_SIZE);
      if (chunk.length === 0) return;
      setRenderedLines((prev) => [...prev, ...chunk]);
      index += CHUNK_SIZE;
      if (index < lines.length) {
        requestAnimationFrame(renderChunk);
      }
    }

    requestAnimationFrame(renderChunk);

    return () => {
      renderingRef.current = false;
    };
  }, [previewJson]);

  const handleCopy = useCallback(async () => {
    if (!previewJson) return;
    await navigator.clipboard.writeText(previewJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [previewJson]);

  const handleExportToFile = useCallback(() => {
    void exportToFileMutation.mutateAsync({ mapId, mergeGroups: true }).then(() => {
      onClose();
    });
  }, [exportToFileMutation, mapId, onClose]);

  if (!open) return null;

  const totalLines = previewJson ? previewJson.split("\n").length : 0;
  const sizeKb = previewJson ? (new Blob([previewJson]).size / 1024).toFixed(1) : "0";

  return (
    <div className="modal-open modal z-[1200]">
      <div className="modal-box flex max-h-[90vh] max-w-4xl flex-col overflow-hidden px-0 py-0 shadow-2xl">
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">GeoJSON Preview</h3>
            <span className="text-xs text-base-content/50">
              {featureCount} {featureCount === 1 ? "feature" : "features"} · {sizeKb} KB ·{" "}
              {totalLines.toLocaleString()} lines
            </span>
            {featureCount > MAX_PREVIEW_FEATURES ? (
              <span className="badge badge-sm badge-warning">
                Showing first {MAX_PREVIEW_FEATURES}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-sm"
              onClick={() => void handleCopy()}
              disabled={!previewJson}
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-sm"
              onClick={handleExportToFile}
              disabled={exportToFileMutation.isPending || !previewJson}
            >
              <Download className="size-3.5" />
              Save file
            </button>
            <button type="button" className="btn btn-square btn-ghost btn-sm" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-base-200/50 p-4 font-mono text-xs leading-relaxed"
        >
          {exportMutation.isPending ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-sm loading-spinner" />
              <span className="ml-2 text-base-content/50">Generating preview...</span>
            </div>
          ) : renderedLines.length > 0 ? (
            <pre className="break-all whitespace-pre-wrap text-base-content/80">
              {renderedLines.join("\n")}
              {renderedLines.length < totalLines ? (
                <span className="text-base-content/30">{"\n"}... rendering ...</span>
              ) : null}
            </pre>
          ) : (
            <div className="flex items-center justify-center py-12 text-base-content/40">
              No data to preview
            </div>
          )}
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}
