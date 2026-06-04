import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ControlPointsFiltersDialog } from "@renderer/features/maps/components/ControlPointsFiltersDialog";
import {
  buildControlPointsFilterChips,
  countActiveControlPointFilters,
  parseControlPointsFilterQuery,
  removeFilterChip,
} from "@renderer/features/maps/lib/control-points-filter-query";

type ControlPointsFilterBarProps = {
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
};

export function ControlPointsFilterBar({
  filterQuery,
  onFilterQueryChange,
  resultCount,
  totalCount,
}: ControlPointsFilterBarProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState(filterQuery);

  useEffect(() => {
    setInputValue(filterQuery);
  }, [filterQuery]);

  const filterState = parseControlPointsFilterQuery(filterQuery);
  const activeCount = countActiveControlPointFilters(filterState);
  const chips = buildControlPointsFilterChips(filterState);
  const isFiltered = activeCount > 0;

  function commitInput(value: string) {
    setInputValue(value);
    onFilterQueryChange(value.trim());
  }

  function removeChip(chipId: string) {
    const next = removeFilterChip(filterState, chipId);
    commitInput(next.query);
  }

  return (
    <>
      <div className="space-y-2" data-test="control-points-filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          <label className="input-bordered input input-sm flex min-w-0 flex-1 items-center gap-2">
            <Search className="size-3.5 shrink-0 text-base-content/40" />
            <input
              type="search"
              className="grow bg-transparent outline-none"
              value={inputValue}
              placeholder={t("maps.workspace.dataExplorer.filters.searchPlaceholder")}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitInput(inputValue);
                }
              }}
              onBlur={() => {
                if (inputValue !== filterQuery) {
                  commitInput(inputValue);
                }
              }}
              data-test="control-points-filter-input"
            />
          </label>
          <button
            type="button"
            className="btn shrink-0 gap-1.5 btn-outline btn-sm"
            onClick={() => setDialogOpen(true)}
            data-test="control-points-filter-dialog"
          >
            <SlidersHorizontal className="size-3.5" />
            {t("maps.workspace.dataExplorer.filters.open")}
            {activeCount > 0 ? (
              <span className="badge badge-xs badge-primary">{activeCount}</span>
            ) : null}
          </button>
        </div>

        {isFiltered ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="badge gap-1 badge-outline font-mono badge-sm hover:badge-error"
                onClick={() => removeChip(chip.id)}
                data-test={`control-points-filter-chip-${chip.id}`}
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            <span className="text-xs text-base-content/50">
              {t("maps.workspace.dataExplorer.filters.resultCount", {
                count: resultCount,
                total: totalCount,
              })}
            </span>
          </div>
        ) : null}
      </div>

      <ControlPointsFiltersDialog
        open={dialogOpen}
        filters={filterState}
        onApply={(query) => {
          commitInput(query);
        }}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
