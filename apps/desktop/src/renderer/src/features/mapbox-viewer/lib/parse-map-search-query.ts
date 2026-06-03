export type ParsedMapCoordinates = {
  latitude: number;
  longitude: number;
};

export function parseMapSearchQuery(query: string): ParsedMapCoordinates | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length !== 2) {
    return null;
  }

  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { latitude: first, longitude: second };
  }

  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return { latitude: second, longitude: first };
  }

  return null;
}
