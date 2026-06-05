import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { sortMapPointsByDistanceFrom } from "@renderer/features/maps/lib/sort-markers-by-distance";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

const NEARBY_CANDIDATE_LIMIT = 30;

function matchesMarkerSearch(candidate: MapPointRecord, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  const label = resolveMapPointLinkRef(candidate).toLowerCase();
  const name = candidate.name?.toLowerCase() ?? "";
  const ref = candidate.ref?.toLowerCase() ?? "";
  return (
    label.includes(normalizedQuery) ||
    name.includes(normalizedQuery) ||
    ref.includes(normalizedQuery) ||
    String(candidate.id).includes(normalizedQuery)
  );
}

export type MapMarkerNeighborsSectionHandle = {
  saveIfDirty: () => Promise<void>;
  isDirty: () => boolean;
};

type MapMarkerNeighborsSectionProps = {
  mapId: number;
  point: MapPointRecord;
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  compact?: boolean;
  hideSaveButton?: boolean;
  onSaved?: () => void;
};

function setsEqual(left: Set<number>, right: Set<number>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function sortCandidatesWithSelectedFirst(
  mapPoints: MapPointRecord[],
  anchor: MapPointRecord,
  selectedIds: Set<number>,
): Array<{ point: MapPointRecord; distanceMeters: number }> {
  const sorted = sortMapPointsByDistanceFrom(mapPoints, anchor, new Set([anchor.id]));
  const selected = sorted.filter((entry) => selectedIds.has(entry.point.id));
  const unselected = sorted.filter((entry) => !selectedIds.has(entry.point.id));
  const remainingSlots = Math.max(0, NEARBY_CANDIDATE_LIMIT - selected.length);
  return [...selected, ...unselected.slice(0, remainingSlots)];
}

export const MapMarkerNeighborsSection = forwardRef<
  MapMarkerNeighborsSectionHandle,
  MapMarkerNeighborsSectionProps
>(function MapMarkerNeighborsSection(
  { mapId, point, mapPoints, neighbors, compact = false, hideSaveButton = false, onSaved },
  ref,
) {
  const { t } = useTranslation();
  const replaceNeighbors = useIpcMutation("markerNeighbors:replace");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const pointsById = useMemo(
    () => new Map(mapPoints.map((entry) => [entry.id, entry])),
    [mapPoints],
  );

  const savedNeighborIds = useMemo(
    () =>
      neighbors
        .filter((neighbor) => neighbor.fromMarkerId === point.id)
        .map((neighbor) => neighbor.toMarkerId)
        .sort((left, right) => left - right),
    [neighbors, point.id],
  );

  const savedNeighborKey = savedNeighborIds.join(",");

  useEffect(() => {
    setSelectedIds(new Set(savedNeighborIds));
    setSearchQuery("");
  }, [point.id, savedNeighborKey, savedNeighborIds]);

  const savedNeighbors = useMemo(
    () =>
      savedNeighborIds
        .map((markerId) => pointsById.get(markerId))
        .filter((entry): entry is MapPointRecord => entry !== undefined),
    [pointsById, savedNeighborIds],
  );

  const candidates = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      return sortMapPointsByDistanceFrom(mapPoints, point, new Set([point.id])).filter((entry) =>
        matchesMarkerSearch(entry.point, trimmedQuery),
      );
    }
    return sortCandidatesWithSelectedFirst(mapPoints, point, selectedIds);
  }, [mapPoints, point, searchQuery, selectedIds]);

  const isDirty = !setsEqual(selectedIds, new Set(savedNeighborIds));

  const saveNeighborsIfDirty = useCallback(async () => {
    if (setsEqual(selectedIds, new Set(savedNeighborIds))) {
      return;
    }
    await replaceNeighbors.mutateAsync({
      mapId,
      fromMarkerId: point.id,
      toMarkerIds: [...selectedIds],
    });
    onSaved?.();
  }, [mapId, onSaved, point.id, replaceNeighbors, savedNeighborIds, selectedIds]);

  useImperativeHandle(
    ref,
    () => ({
      saveIfDirty: saveNeighborsIfDirty,
      isDirty: () => !setsEqual(selectedIds, new Set(savedNeighborIds)),
    }),
    [saveNeighborsIfDirty, savedNeighborIds, selectedIds],
  );

  function toggleCandidate(markerId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(markerId)) {
        next.delete(markerId);
      } else {
        next.add(markerId);
      }
      return next;
    });
  }

  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {t("maps.workspace.dataExplorer.neighbors.title")}
        </h4>
        {!compact ? (
          <p className="mt-1 text-[11px] text-base-content/50">
            {t("maps.workspace.dataExplorer.neighbors.hint")}
          </p>
        ) : null}
      </div>

      {savedNeighbors.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {savedNeighbors.map((neighbor) => (
            <span
              key={neighbor.id}
              className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary"
            >
              {resolveMapPointLinkRef(neighbor)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-base-content/45">
          {t("maps.workspace.dataExplorer.neighbors.noneSaved")}
        </p>
      )}

      <p className="text-[10px] font-medium tracking-wide text-base-content/45 uppercase">
        {searchQuery.trim()
          ? t("maps.workspace.dataExplorer.neighbors.searchTitle")
          : t("maps.workspace.dataExplorer.neighbors.nearbyTitle")}
      </p>
      <label className="input-bordered input input-xs flex w-full items-center gap-2">
        <Search className="size-3 shrink-0 text-base-content/45" />
        <input
          className="grow bg-transparent text-xs outline-none"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("maps.workspace.dataExplorer.neighbors.searchPlaceholder")}
        />
      </label>
      <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100/40 p-1">
        {candidates.length === 0 ? (
          <li className="px-2 py-3 text-center text-[11px] text-base-content/45">
            {searchQuery.trim()
              ? t("maps.workspace.dataExplorer.neighbors.noMatches")
              : t("maps.workspace.dataExplorer.neighbors.noNearby")}
          </li>
        ) : (
          candidates.map(({ point: candidate, distanceMeters }) => {
            const checked = selectedIds.has(candidate.id);
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                    checked ? "bg-primary/12" : "hover:bg-base-200/70",
                  )}
                  onClick={() => toggleCandidate(candidate.id)}
                >
                  <input
                    type="checkbox"
                    className="pointer-events-none checkbox checkbox-xs checkbox-primary"
                    checked={checked}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
                    {resolveMapPointLinkRef(candidate)}
                  </span>
                  <span className="shrink-0 text-[10px] text-base-content/45 tabular-nums">
                    {Math.round(distanceMeters)} m
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {hideSaveButton ? null : (
        <button
          type="button"
          className="btn w-full btn-outline btn-xs"
          disabled={!isDirty || replaceNeighbors.isPending}
          onClick={() => void saveNeighborsIfDirty()}
        >
          {replaceNeighbors.isPending
            ? t("maps.workspace.dataExplorer.neighbors.saving")
            : t("maps.workspace.dataExplorer.neighbors.save")}
        </button>
      )}
    </section>
  );
});
