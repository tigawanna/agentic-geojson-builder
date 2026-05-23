export type ParsedMapCoordinates = {
  latitude: number;
  longitude: number;
};

function isLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isLongitude(value: number) {
  return value >= -180 && value <= 180;
}

function normalizePair(first: number, second: number): ParsedMapCoordinates | null {
  if (isLatitude(first) && isLongitude(second)) {
    return { latitude: first, longitude: second };
  }

  if (isLatitude(second) && isLongitude(first)) {
    return { latitude: second, longitude: first };
  }

  return null;
}

export function parseMapCoordinates(
  input: string,
): { ok: true; value: ParsedMapCoordinates } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter coordinates or a Google Maps link." };
  }

  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const parsed = normalizePair(Number(atMatch[1]), Number(atMatch[2]));
    if (parsed) {
      return { ok: true, value: parsed };
    }
  }

  const queryMatch = trimmed.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryMatch) {
    const parsed = normalizePair(Number(queryMatch[1]), Number(queryMatch[2]));
    if (parsed) {
      return { ok: true, value: parsed };
    }
  }

  const coordinateMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*[,]\s*(-?\d+(?:\.\d+)?)/);
  if (coordinateMatch) {
    const parsed = normalizePair(Number(coordinateMatch[1]), Number(coordinateMatch[2]));
    if (parsed) {
      return { ok: true, value: parsed };
    }
  }

  const spaceParts = trimmed.split(/\s+/).filter(Boolean);
  if (spaceParts.length >= 2) {
    const parsed = normalizePair(Number(spaceParts[0]), Number(spaceParts[1]));
    if (parsed) {
      return { ok: true, value: parsed };
    }
  }

  return {
    ok: false,
    error: "Use latitude, longitude (for example -1.24500, 36.81234) or paste a Google Maps link.",
  };
}
