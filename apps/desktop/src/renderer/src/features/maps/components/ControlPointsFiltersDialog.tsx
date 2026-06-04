import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  buildControlPointsFilterChips,
  buildQueryFromDraft,
  draftToFilterState,
  filterStateToDraft,
  parseControlPointsFilterQuery,
  type ControlPointsFilterDraft,
  type ControlPointsFilterState,
  type ControlPointsSortMode,
} from "@renderer/features/maps/lib/control-points-filter-query";
import { parseCoordinatePaste } from "@renderer/features/maps/lib/parse-coordinate-paste";

type ControlPointsFiltersDialogProps = {
  open: boolean;
  filters: ControlPointsFilterState;
  onApply: (query: string) => void;
  onClose: () => void;
};

const SORT_OPTIONS: ControlPointsSortMode[] = [
  "default",
  "distance-asc",
  "distance-desc",
  "alt-asc",
  "alt-desc",
  "id-asc",
  "id-desc",
  "label-asc",
  "label-desc",
];

function mergeCoordinateIntoDraft(
  draft: ControlPointsFilterDraft,
  pasted: string,
  field: "latitude" | "longitude" | "near",
): ControlPointsFilterDraft {
  const parsed = parseCoordinatePaste(pasted, field === "near" ? "latitude" : field);
  if (!parsed) {
    return { ...draft, [field]: pasted };
  }
  if (field === "near") {
    const lat = parsed.latitude ?? draft.near.split(",")[0]?.trim() ?? "";
    const lng = parsed.longitude ?? draft.near.split(",")[1]?.trim() ?? "";
    const alt = parsed.altitude?.trim();
    return {
      ...draft,
      near: alt ? `${lat}, ${lng}, ${alt}` : `${lat}, ${lng}`,
    };
  }
  return {
    ...draft,
    latitude: parsed.latitude ?? draft.latitude,
    longitude: parsed.longitude ?? draft.longitude,
    altitude: parsed.altitude ?? draft.altitude,
  };
}

export function ControlPointsFiltersDialog({
  open,
  filters,
  onApply,
  onClose,
}: ControlPointsFiltersDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => filterStateToDraft(filters));

  useEffect(() => {
    if (open) {
      setDraft(filterStateToDraft(filters));
    }
  }, [open, filters]);

  const previewState = useMemo(() => {
    if (draft.query.trim()) {
      return parseControlPointsFilterQuery(draft.query);
    }
    return draftToFilterState(draft);
  }, [draft]);

  const previewChips = useMemo(() => buildControlPointsFilterChips(previewState), [previewState]);

  if (!open) {
    return null;
  }

  function handleApply() {
    const query = draft.query.trim() ? draft.query.trim() : buildQueryFromDraft(draft);
    onApply(query);
    onClose();
  }

  function handleClear() {
    onApply("");
    onClose();
  }

  function syncQueryFromFields(next: ControlPointsFilterDraft) {
    return { ...next, query: "" };
  }

  return (
    <div className="modal-open modal z-1300">
      <div className="modal-box max-w-lg px-6 py-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </span>
              <h4 className="text-base font-semibold">
                {t("maps.workspace.dataExplorer.filters.title")}
              </h4>
            </div>
            <p className="mt-2 text-sm text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-square btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t("maps.workspace.dataExplorer.filters.close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="form-control gap-1.5">
          <span className="label-text text-xs font-medium text-base-content/60">
            {t("maps.workspace.dataExplorer.filters.queryLabel")}
          </span>
          <textarea
            className="textarea-bordered textarea w-full font-mono text-sm leading-relaxed"
            rows={3}
            value={draft.query}
            placeholder={t("maps.workspace.dataExplorer.filters.queryPlaceholder")}
            onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
            data-test="control-points-filter-query"
          />
          <span className="text-xs text-base-content/45">
            {t("maps.workspace.dataExplorer.filters.queryHint")}
          </span>
        </label>

        <div className="divider my-4 text-xs text-base-content/40">
          {t("maps.workspace.dataExplorer.filters.orUseFields")}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="form-control gap-1.5 sm:col-span-2">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.keyword")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full"
              value={draft.text}
              placeholder={t("maps.workspace.dataExplorer.filters.keywordPlaceholder")}
              onChange={(event) =>
                setDraft((current) => syncQueryFromFields({ ...current, text: event.target.value }))
              }
            />
          </label>

          <label className="form-control gap-1.5 sm:col-span-2">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.label")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full"
              value={draft.label}
              placeholder={t("maps.workspace.dataExplorer.filters.labelPlaceholder")}
              onChange={(event) =>
                setDraft((current) =>
                  syncQueryFromFields({ ...current, label: event.target.value }),
                )
              }
            />
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.latitude")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full font-mono"
              value={draft.latitude}
              onChange={(event) =>
                setDraft((current) =>
                  syncQueryFromFields({ ...current, latitude: event.target.value }),
                )
              }
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted.includes(",") && !pasted.includes(" ")) {
                  return;
                }
                event.preventDefault();
                setDraft((current) =>
                  syncQueryFromFields(mergeCoordinateIntoDraft(current, pasted, "latitude")),
                );
              }}
            />
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.longitude")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full font-mono"
              value={draft.longitude}
              onChange={(event) =>
                setDraft((current) =>
                  syncQueryFromFields({ ...current, longitude: event.target.value }),
                )
              }
            />
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.altitude")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full font-mono"
              value={draft.altitude}
              placeholder={t("maps.workspace.dataExplorer.filters.altitudePlaceholder")}
              onChange={(event) =>
                setDraft((current) =>
                  syncQueryFromFields({ ...current, altitude: event.target.value }),
                )
              }
            />
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.near")}
            </span>
            <input
              type="text"
              className="input-bordered input input-sm w-full font-mono"
              value={draft.near}
              placeholder={t("maps.workspace.dataExplorer.filters.nearPlaceholder")}
              onChange={(event) =>
                setDraft((current) => syncQueryFromFields({ ...current, near: event.target.value }))
              }
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted.includes(",") && !pasted.includes(" ")) {
                  return;
                }
                event.preventDefault();
                setDraft((current) =>
                  syncQueryFromFields(mergeCoordinateIntoDraft(current, pasted, "near")),
                );
              }}
            />
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">ID</span>
            <input
              type="number"
              min={1}
              className="input-bordered input input-sm w-full"
              value={draft.id}
              onChange={(event) =>
                setDraft((current) => syncQueryFromFields({ ...current, id: event.target.value }))
              }
            />
          </label>

          <label className="form-control gap-1.5 sm:col-span-2">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.dataExplorer.filters.sort")}
            </span>
            <select
              className="select-bordered select w-full select-sm"
              value={draft.sort}
              onChange={(event) =>
                setDraft((current) =>
                  syncQueryFromFields({
                    ...current,
                    sort: event.target.value as ControlPointsSortMode,
                  }),
                )
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`maps.workspace.dataExplorer.filters.sortOptions.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {previewChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {previewChips.map((chip) => (
              <span key={chip.id} className="badge gap-1 badge-outline font-mono badge-sm">
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="modal-action mt-6">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
            {t("maps.workspace.dataExplorer.filters.clear")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApply}
            data-test="control-points-filter-apply"
          >
            {t("maps.workspace.dataExplorer.filters.apply")}
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}
