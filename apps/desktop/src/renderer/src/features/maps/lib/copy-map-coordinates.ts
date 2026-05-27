export function formatMapCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export async function copyMapCoordinates(latitude: number, longitude: number) {
  const text = formatMapCoordinates(latitude, longitude);
  await navigator.clipboard.writeText(text);
  return text;
}
