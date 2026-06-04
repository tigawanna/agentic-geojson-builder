import type { MapPointRecord } from "@shared/map-points.types";

export function filterMapPointsBySearch(
  mapPoints: MapPointRecord[],
  searchQuery: string,
): MapPointRecord[] {
  const query = searchQuery.trim().toLowerCase();
  if (query.length === 0) {
    return mapPoints;
  }

  return mapPoints.filter((point) => {
    const haystack = [
      String(point.id),
      point.ref,
      point.name,
      point.category,
      point.description,
      point.parentRef,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
