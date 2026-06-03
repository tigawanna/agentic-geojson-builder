import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Download } from "lucide-react";
import type { GeoSegmentStatus } from "@shared/geo-segments.types";
import type { BundleExportFormat, BuildBundleInput } from "@shared/map-bundle.types";
import { MAP_POINT_CATEGORIES, type MapPointCategory } from "@shared/map-points.types";
import { ipcInvoke, useIpcMutation, useIpcQuery } from "@renderer/hooks/useIpc";
import { MapExportValidationList } from "@renderer/features/maps/components/MapExportValidationList";

const PATH_STATUSES: GeoSegmentStatus[] = ["draft", "needs-review", "accepted", "rejected"];

const FORMAT_TABS: { id: BundleExportFormat; label: string }[] = [
  { id: "bundle", label: "Bundle (v2)" },
  { id: "points", label: "Points" },
  { id: "paths", label: "Paths" },
  { id: "links", label: "Links" },
  { id: "combined", label: "Combined GeoJSON" },
];

function payloadForFormat(
  format: BundleExportFormat,
  result: { bundle: unknown; combined: unknown },
): unknown {
  const bundle = result.bundle as {
    points: unknown;
    paths: unknown;
    links: unknown;
  };
  switch (format) {
    case "points":
      return bundle.points;
    case "paths":
      return bundle.paths;
    case "links":
      return bundle.links;
    case "combined":
      return result.combined;
    case "bundle":
      return result.bundle;
  }
}

type MapExportPageProps = {
  mapId: number;
};

export function MapExportPage({ mapId }: MapExportPageProps) {
  const [includePaths, setIncludePaths] = useState(true);
  const [includePoints, setIncludePoints] = useState(true);
  const [includeLinks, setIncludeLinks] = useState(true);
  const [mergePathGroups, setMergePathGroups] = useState(true);
  const [pathStatuses, setPathStatuses] = useState<GeoSegmentStatus[]>([
    "draft",
    "needs-review",
    "accepted",
  ]);
  const [pointCategories, setPointCategories] = useState<MapPointCategory[]>([]);
  const [format, setFormat] = useState<BundleExportFormat>("bundle");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildInput: BuildBundleInput = {
    mapId,
    includePaths,
    includePoints,
    includeLinks,
    mergePathGroups,
    pathStatuses,
    pointCategories: pointCategories.length > 0 ? pointCategories : undefined,
  };

  const bundleQuery = useIpcQuery("bundle:build", buildInput, { staleTime: 0 });
  const exportMutation = useIpcMutation("bundle:exportToFile");

  function toggleStatus(status: GeoSegmentStatus) {
    setPathStatuses((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  }

  function toggleCategory(category: MapPointCategory) {
    setPointCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  }

  const result = bundleQuery.data;
  const previewJson = result ? JSON.stringify(payloadForFormat(format, result), null, 2) : "";
  const blockedByErrors = (result?.validation.errorCount ?? 0) > 0;

  async function handleCopy() {
    await navigator.clipboard.writeText(previewJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const saved = await ipcInvoke("bundle:exportToFile", { ...buildInput, format });
      if (saved.canceled) {
        return;
      }
      setStatusMessage(`Exported ${saved.featureCount} item(s) → ${saved.savedPath}`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/maps/$mapId"
          params={{ mapId: String(mapId) }}
          className="inline-flex size-8 items-center justify-center rounded-md text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
          aria-label="Back to workspace"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export</h1>
          <p className="text-sm text-base-content/60">
            {result?.bundle.mapName ?? "Map"} · versioned routing bundle for the mobile app
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <article className="glass-card space-y-4 p-5">
            <h3 className="text-base font-semibold">Sections</h3>
            <div className="space-y-2.5">
              <ToggleRow
                label="Paths (traced trails)"
                checked={includePaths}
                onChange={setIncludePaths}
              />
              <ToggleRow
                label="Points (markers)"
                checked={includePoints}
                onChange={setIncludePoints}
              />
              <ToggleRow label="Links (edges)" checked={includeLinks} onChange={setIncludeLinks} />
              <ToggleRow
                label="Merge path groups on export"
                checked={mergePathGroups}
                onChange={setMergePathGroups}
              />
            </div>
          </article>

          <article className="glass-card space-y-3 p-5">
            <h3 className="text-base font-semibold">Path statuses</h3>
            <div className="flex flex-wrap gap-1.5">
              {PATH_STATUSES.map((status) => (
                <ChipToggle
                  key={status}
                  label={status}
                  active={pathStatuses.includes(status)}
                  onClick={() => toggleStatus(status)}
                />
              ))}
            </div>
          </article>

          <article className="glass-card space-y-3 p-5">
            <h3 className="text-base font-semibold">Point categories</h3>
            <p className="text-xs text-base-content/55">No selection exports all categories.</p>
            <div className="flex flex-wrap gap-1.5">
              {MAP_POINT_CATEGORIES.map((category) => (
                <ChipToggle
                  key={category}
                  label={category}
                  active={pointCategories.includes(category)}
                  onClick={() => toggleCategory(category)}
                />
              ))}
            </div>
          </article>

          <article className="glass-card space-y-3 p-5">
            <h3 className="text-base font-semibold">Validation</h3>
            {result ? (
              <MapExportValidationList report={result.validation} />
            ) : (
              <p className="text-sm text-base-content/55">Building…</p>
            )}
          </article>
        </div>

        <article className="glass-card flex min-h-0 flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-base-100/50 p-1">
              {FORMAT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    format === tab.id
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-base-content/65 hover:bg-base-content/8 hover:text-base-content"
                  }`}
                  onClick={() => setFormat(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!previewJson}
                onClick={() => void handleCopy()}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!result || exportMutation.isPending || blockedByErrors}
                title={blockedByErrors ? "Resolve validation errors before exporting" : undefined}
                onClick={() => void handleSave()}
                data-test="export-bundle-save"
              >
                <Download className="size-4" />
                Save file
              </button>
            </div>
          </div>
          {blockedByErrors ? (
            <p className="mb-2 text-xs text-error">
              Saving is blocked while validation errors remain.
            </p>
          ) : null}
          {statusMessage ? (
            <p className="mb-2 text-xs break-all text-success">{statusMessage}</p>
          ) : null}
          {errorMessage ? <p className="mb-2 text-xs text-error">{errorMessage}</p> : null}
          <pre className="selectable min-h-0 flex-1 overflow-auto rounded-box border border-base-content/10 bg-base-200/40 p-4 text-xs leading-relaxed text-base-content/75">
            {previewJson || "—"}
          </pre>
        </article>
      </div>
    </section>
  );
}

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

type ChipToggleProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ChipToggle({ label, active, onClick }: ChipToggleProps) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-content"
          : "bg-base-content/8 text-base-content/65 hover:bg-base-content/15"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
