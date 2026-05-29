import type { MapBounds } from "@renderer/features/maps/lib/map-handle";

export function segmentGroupColor(segmentGroupId: string) {
  let hash = 0;
  for (let index = 0; index < segmentGroupId.length; index += 1) {
    hash = segmentGroupId.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 72%, 42%)`;
}

export function lineStringToLatLngs(coordinates: [number, number][]) {
  return coordinates.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
}

export function lineStringToMapBounds(coordinates: [number, number][]): MapBounds | null {
  if (coordinates.length === 0) {
    return null;
  }

  const latitudes = coordinates.map(([, latitude]) => latitude);
  const longitudes = coordinates.map(([longitude]) => longitude);
  let south = Math.min(...latitudes);
  let north = Math.max(...latitudes);
  let west = Math.min(...longitudes);
  let east = Math.max(...longitudes);

  const minSpan = 0.0003;
  if (north - south < minSpan) {
    const mid = (north + south) / 2;
    south = mid - minSpan / 2;
    north = mid + minSpan / 2;
  }
  if (east - west < minSpan) {
    const mid = (east + west) / 2;
    west = mid - minSpan / 2;
    east = mid + minSpan / 2;
  }

  return { north, south, east, west };
}
