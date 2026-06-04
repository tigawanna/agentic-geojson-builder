export type CoordinateTriple = {
  latitude: string;
  longitude: string;
  altitude: string;
};

export type CoordinateField = keyof CoordinateTriple;

function splitCoordinateParts(raw: string): string[] {
  return raw
    .trim()
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseCoordinatePaste(
  pastedText: string,
  focusedField: CoordinateField,
): Partial<CoordinateTriple> | null {
  const parts = splitCoordinateParts(pastedText);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return { [focusedField]: parts[0]! };
  }
  if (parts.length === 2) {
    return {
      latitude: parts[0]!,
      longitude: parts[1]!,
    };
  }
  return {
    latitude: parts[0]!,
    longitude: parts[1]!,
    altitude: parts[2]!,
  };
}

export function mergeCoordinateTriple(
  current: CoordinateTriple,
  patch: Partial<CoordinateTriple>,
): CoordinateTriple {
  return {
    latitude: patch.latitude ?? current.latitude,
    longitude: patch.longitude ?? current.longitude,
    altitude: patch.altitude ?? current.altitude,
  };
}

export function formatCoordinateTripleCopy(
  latitude: number,
  longitude: number,
  altitudeM: number | null,
): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  if (altitudeM === null) {
    return `${lat}, ${lng}`;
  }
  return `${lat}, ${lng}, ${altitudeM.toFixed(1)}`;
}

export function parseCoordinateTripleForSave(values: CoordinateTriple): {
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  error: string | null;
} {
  const latitude = Number(values.latitude);
  const longitude = Number(values.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return {
      latitude: 0,
      longitude: 0,
      altitudeM: null,
      error: "Latitude must be between -90 and 90.",
    };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      latitude: 0,
      longitude: 0,
      altitudeM: null,
      error: "Longitude must be between -180 and 180.",
    };
  }
  const altitudeRaw = values.altitude.trim();
  if (!altitudeRaw) {
    return { latitude, longitude, altitudeM: null, error: null };
  }
  const altitudeM = Number(altitudeRaw);
  if (!Number.isFinite(altitudeM)) {
    return {
      latitude: 0,
      longitude: 0,
      altitudeM: null,
      error: "Altitude must be a valid number.",
    };
  }
  return { latitude, longitude, altitudeM, error: null };
}
