import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { filterMapPointsBySearch } from "@renderer/features/maps/lib/map-points-list-filter";
import { sortMapPointsByDistanceFrom } from "@renderer/features/maps/lib/sort-markers-by-distance";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MapPointRecord } from "@shared/map-points.types";

const RESULT_LIMIT = 24;

type MapPointSearchPickerProps = {
  label: string;
  pointId: number | null;
  mapPoints: MapPointRecord[];
  pickActive?: boolean;
  excludePointIds?: number[];
  nearbyAnchor?: MapPointRecord | null;
  onPickToggle?: () => void;
  onSelect: (pointId: number) => void;
  onClear: () => void;
};

export function MapPointSearchPicker({
  label,
  pointId,
  mapPoints,
  pickActive = false,
  excludePointIds = [],
  nearbyAnchor = null,
  onPickToggle,
  onSelect,
  onClear,
}: MapPointSearchPickerProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const selectedPoint =
    pointId !== null ? (mapPoints.find((entry) => entry.id === pointId) ?? null) : null;

  const excludeSet = useMemo(() => new Set(excludePointIds), [excludePointIds]);

  const candidates = useMemo(() => {
    const available = mapPoints.filter((point) => !excludeSet.has(point.id));
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      return filterMapPointsBySearch(available, trimmedQuery).slice(0, RESULT_LIMIT);
    }
    if (nearbyAnchor) {
      return sortMapPointsByDistanceFrom(available, nearbyAnchor)
        .slice(0, RESULT_LIMIT)
        .map((entry) => entry.point);
    }
    return available.slice(0, RESULT_LIMIT);
  }, [excludeSet, mapPoints, nearbyAnchor, searchQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setListOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleSelect(nextPointId: number) {
    onSelect(nextPointId);
    setSearchQuery("");
    setListOpen(false);
  }

  const inputValue = listOpen
    ? searchQuery
    : selectedPoint
      ? resolveMapPointLinkRef(selectedPoint)
      : "";

  return (
    <div ref={rootRef} className="flex items-start gap-2">
      {onPickToggle ? (
        <button
          type="button"
          className={cn(
            "btn btn-square shrink-0 btn-xs",
            pickActive ? "btn-primary" : "btn-outline",
          )}
          onClick={onPickToggle}
          aria-pressed={pickActive}
          title={label}
        >
          <MapPin className="size-3.5" />
        </button>
      ) : null}
      <div className="relative min-w-0 flex-1">
        <label className="input-bordered input input-xs flex w-full items-center gap-2">
          <Search className="size-3 shrink-0 text-base-content/45" />
          <input
            className="grow bg-transparent font-mono text-xs outline-none"
            value={inputValue}
            placeholder={label}
            onFocus={() => {
              setListOpen(true);
              setSearchQuery("");
            }}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setListOpen(true);
            }}
            data-test={`map-point-search-picker-${label}`}
          />
        </label>
        {listOpen ? (
          <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-base-content/15 bg-base-100 p-1 shadow-lg">
            {candidates.length === 0 ? (
              <li className="px-2 py-2 text-center text-[11px] text-base-content/45">
                {t("maps.workspace.linkComposer.routePlanner.noSearchMatches")}
              </li>
            ) : (
              candidates.map((point) => (
                <li key={point.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors hover:bg-base-200/80",
                      point.id === pointId ? "bg-primary/12 text-primary" : "",
                    )}
                    onClick={() => handleSelect(point.id)}
                  >
                    {resolveMapPointLinkRef(point)}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {pointId !== null ? (
        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-xs"
          onClick={onClear}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

type MapPointSearchAddListProps = {
  mapPoints: MapPointRecord[];
  excludePointIds?: number[];
  nearbyAnchor?: MapPointRecord | null;
  onAdd: (pointId: number) => void;
  placeholder: string;
};

export function MapPointSearchAddList({
  mapPoints,
  excludePointIds = [],
  nearbyAnchor = null,
  onAdd,
  placeholder,
}: MapPointSearchAddListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const excludeSet = useMemo(() => new Set(excludePointIds), [excludePointIds]);

  const candidates = useMemo(() => {
    const available = mapPoints.filter((point) => !excludeSet.has(point.id));
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      return filterMapPointsBySearch(available, trimmedQuery).slice(0, RESULT_LIMIT);
    }
    if (nearbyAnchor) {
      return sortMapPointsByDistanceFrom(available, nearbyAnchor)
        .slice(0, RESULT_LIMIT)
        .map((entry) => entry.point);
    }
    return [];
  }, [excludeSet, mapPoints, nearbyAnchor, searchQuery]);

  return (
    <div className="space-y-1.5">
      <label className="input-bordered input input-xs flex w-full items-center gap-2">
        <Search className="size-3 shrink-0 text-base-content/45" />
        <input
          className="grow bg-transparent text-xs outline-none"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={placeholder}
          data-test="route-planner-via-search"
        />
      </label>
      {searchQuery.trim() || nearbyAnchor ? (
        <ul className="max-h-36 space-y-0.5 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100/40 p-1">
          {candidates.length === 0 ? (
            <li className="px-2 py-2 text-center text-[11px] text-base-content/45">
              {t("maps.workspace.linkComposer.routePlanner.noSearchMatches")}
            </li>
          ) : (
            candidates.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors hover:bg-base-200/80"
                  onClick={() => {
                    onAdd(point.id);
                    setSearchQuery("");
                  }}
                >
                  {resolveMapPointLinkRef(point)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
