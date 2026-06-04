import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import type { MapPointRecord } from "@shared/map-points.types";

export function resolveVisibleMapPointsForExplorer(
  mapPoints: MapPointRecord[],
  checkedMapPointIds: number[],
  selection: MapDataExplorerSelection | null,
): MapPointRecord[] {
  if (checkedMapPointIds.length > 0) {
    const visibleIds = new Set(checkedMapPointIds);
    return mapPoints.filter((point) => visibleIds.has(point.id));
  }

  if (selection?.kind === "map-point") {
    const selected = mapPoints.find((point) => point.id === selection.id);
    return selected ? [selected] : [];
  }

  return [];
}
