export type MapboxProbeCoordinates = {
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
};

export function formatProbeCoordinatesLatLng({ latitude, longitude }: MapboxProbeCoordinates) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function formatProbeCoordinatesLngLatAlt(coords: MapboxProbeCoordinates) {
  const lng = coords.longitude.toFixed(6);
  const lat = coords.latitude.toFixed(6);
  if (coords.elevationMeters === null) {
    return `${lng}, ${lat}`;
  }
  return `${lng}, ${lat}, ${coords.elevationMeters.toFixed(1)}`;
}

export function formatProbeCoordinatesGeoJson(coords: MapboxProbeCoordinates) {
  if (coords.elevationMeters === null) {
    return `[${coords.longitude.toFixed(6)}, ${coords.latitude.toFixed(6)}]`;
  }
  return `[${coords.longitude.toFixed(6)}, ${coords.latitude.toFixed(6)}, ${coords.elevationMeters.toFixed(1)}]`;
}

export async function copyProbeText(text: string) {
  await navigator.clipboard.writeText(text);
  return text;
}
