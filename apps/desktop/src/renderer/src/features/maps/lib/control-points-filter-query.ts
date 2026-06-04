import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";
import type { ControlPointRecord } from "@shared/control-points.types";

const COORD_TOLERANCE = 0.0005;

export type ControlPointsSortMode =
  | "default"
  | "distance-asc"
  | "distance-desc"
  | "alt-asc"
  | "alt-desc"
  | "id-asc"
  | "id-desc"
  | "label-asc"
  | "label-desc";

export type ControlPointsFilterState = {
  query: string;
  text: string | null;
  label: string | null;
  id: number | null;
  latitude: number | null;
  longitude: number | null;
  altitudeMin: number | null;
  altitudeMax: number | null;
  altitudeExact: number | null;
  nearLatitude: number | null;
  nearLongitude: number | null;
  sort: ControlPointsSortMode;
};

export type FilterChip = {
  id: string;
  label: string;
};

export const EMPTY_CONTROL_POINTS_FILTER: ControlPointsFilterState = {
  query: "",
  text: null,
  label: null,
  id: null,
  latitude: null,
  longitude: null,
  altitudeMin: null,
  altitudeMax: null,
  altitudeExact: null,
  nearLatitude: null,
  nearLongitude: null,
  sort: "default",
};

function splitCoordinateParts(raw: string): string[] {
  return raw
    .trim()
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAltitudeValue(raw: string): {
  exact: number | null;
  min: number | null;
  max: number | null;
} {
  const trimmed = raw.trim();
  const rangeMatch = /^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (rangeMatch) {
    const min = parseNumber(rangeMatch[1]!);
    const max = parseNumber(rangeMatch[2]!);
    return { exact: null, min, max };
  }
  if (trimmed.startsWith(">=")) {
    return { exact: null, min: parseNumber(trimmed.slice(2)), max: null };
  }
  if (trimmed.startsWith("<=")) {
    return { exact: null, min: null, max: parseNumber(trimmed.slice(2)) };
  }
  if (trimmed.startsWith(">")) {
    return { exact: null, min: parseNumber(trimmed.slice(1)), max: null };
  }
  if (trimmed.startsWith("<")) {
    return { exact: null, min: null, max: parseNumber(trimmed.slice(1)) };
  }
  return { exact: parseNumber(trimmed), min: null, max: null };
}

function tokenizeFilterQuery(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let index = 0; index < query.length; index += 1) {
    const char = query[index]!;
    if ((char === '"' || char === "'") && query[index - 1] !== "\\") {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }
      if (char === quoteChar) {
        inQuotes = false;
        quoteChar = "";
        continue;
      }
    }
    if (!inQuotes && /\s/.test(char)) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

function isValidLatitude(latitude: number): boolean {
  return latitude >= -90 && latitude <= 90;
}

function isValidLongitude(longitude: number): boolean {
  return longitude >= -180 && longitude <= 180;
}

function parseCoordinateTokenValue(raw: string): { value: number | null; exact: boolean } {
  const trimmed = raw.trim();
  const exact = trimmed.startsWith("=");
  const value = parseNumber(exact ? trimmed.slice(1) : trimmed);
  return { value, exact };
}

function tryParseCoordinateOnlyQuery(query: string): Partial<ControlPointsFilterState> | null {
  const parts = splitCoordinateParts(query);
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  if (!parts.every((part) => /^-?\d+(\.\d+)?$/.test(part))) {
    return null;
  }
  const latitude = parseNumber(parts[0]!);
  const longitude = parseNumber(parts[1]!);
  if (latitude === null || longitude === null) {
    return null;
  }
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }
  const altitudeExact = parts[2] ? parseNumber(parts[2]) : null;
  return {
    nearLatitude: latitude,
    nearLongitude: longitude,
    altitudeExact,
    sort: "distance-asc",
  };
}

function finalizeFilterState(state: ControlPointsFilterState): ControlPointsFilterState {
  const hasNear = state.nearLatitude !== null && state.nearLongitude !== null;
  const isDistanceSort = state.sort === "distance-asc" || state.sort === "distance-desc";

  if (hasNear && state.sort === "default") {
    return {
      ...state,
      latitude: null,
      longitude: null,
      sort: "distance-asc",
    };
  }

  if (hasNear && isDistanceSort) {
    return {
      ...state,
      latitude: null,
      longitude: null,
    };
  }

  return state;
}

function normalizeSortKey(raw: string): ControlPointsSortMode {
  const trimmed = raw.trim().toLowerCase();
  const descending = trimmed.startsWith("-");
  const key = descending ? trimmed.slice(1) : trimmed;
  if (key === "distance" || key === "dist") {
    return descending ? "distance-desc" : "distance-asc";
  }
  if (key === "alt" || key === "altitude" || key === "elevation") {
    return descending ? "alt-desc" : "alt-asc";
  }
  if (key === "id") {
    return descending ? "id-desc" : "id-asc";
  }
  if (key === "label" || key === "name") {
    return descending ? "label-desc" : "label-asc";
  }
  return "default";
}

export function parseControlPointsFilterQuery(query: string): ControlPointsFilterState {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ...EMPTY_CONTROL_POINTS_FILTER };
  }

  const coordinateOnly = tryParseCoordinateOnlyQuery(trimmed);
  if (coordinateOnly) {
    return finalizeFilterState({
      ...EMPTY_CONTROL_POINTS_FILTER,
      query: trimmed,
      ...coordinateOnly,
    });
  }

  const state: ControlPointsFilterState = { ...EMPTY_CONTROL_POINTS_FILTER, query: trimmed };
  const freeText: string[] = [];

  for (const token of tokenizeFilterQuery(trimmed)) {
    const colonIndex = token.indexOf(":");
    if (colonIndex <= 0) {
      freeText.push(token);
      continue;
    }

    const key = token.slice(0, colonIndex).toLowerCase();
    let value = token.slice(colonIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "q" || key === "text" || key === "search") {
      state.text = value;
      continue;
    }
    if (key === "label") {
      state.label = value;
      continue;
    }
    if (key === "id") {
      state.id = parseNumber(value);
      continue;
    }
    if (key === "lat" || key === "latitude") {
      const parsed = parseCoordinateTokenValue(value);
      if (parsed.value !== null && isValidLatitude(parsed.value)) {
        state.nearLatitude = parsed.value;
        if (parsed.exact) {
          state.latitude = parsed.value;
        }
      }
      continue;
    }
    if (key === "lng" || key === "lon" || key === "long" || key === "longitude") {
      const parsed = parseCoordinateTokenValue(value);
      if (parsed.value !== null && isValidLongitude(parsed.value)) {
        state.nearLongitude = parsed.value;
        if (parsed.exact) {
          state.longitude = parsed.value;
        }
      }
      continue;
    }
    if (key === "alt" || key === "altitude" || key === "elevation") {
      const altitude = parseAltitudeValue(value);
      state.altitudeExact = altitude.exact;
      state.altitudeMin = altitude.min;
      state.altitudeMax = altitude.max;
      continue;
    }
    if (key === "near") {
      const parts = splitCoordinateParts(value);
      if (parts.length >= 2) {
        state.nearLatitude = parseNumber(parts[0]!);
        state.nearLongitude = parseNumber(parts[1]!);
        if (parts[2]) {
          state.altitudeExact = parseNumber(parts[2]);
        }
      }
      continue;
    }
    if (key === "sort") {
      state.sort = normalizeSortKey(value);
      continue;
    }

    freeText.push(token);
  }

  if (freeText.length > 0) {
    const combined = freeText.join(" ").trim();
    state.text = state.text ? `${state.text} ${combined}` : combined;
  }

  return finalizeFilterState(state);
}

export function countActiveControlPointFilters(state: ControlPointsFilterState): number {
  let count = 0;
  if (state.text) count += 1;
  if (state.label) count += 1;
  if (state.id !== null) count += 1;
  if (state.latitude !== null) count += 1;
  if (state.longitude !== null) count += 1;
  if (state.altitudeExact !== null || state.altitudeMin !== null || state.altitudeMax !== null) {
    count += 1;
  }
  if (
    state.nearLatitude !== null &&
    state.nearLongitude !== null &&
    state.latitude === null &&
    state.longitude === null
  ) {
    count += 1;
  }
  if (state.sort !== "default") count += 1;
  return count;
}

export function buildControlPointsFilterChips(state: ControlPointsFilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.text) {
    chips.push({
      id: "text",
      label: state.text.includes(" ") ? `q:"${state.text}"` : state.text,
    });
  }
  if (state.label) {
    chips.push({ id: "label", label: `label:"${state.label}"` });
  }
  if (state.id !== null) {
    chips.push({ id: "id", label: `id:${state.id}` });
  }
  if (state.latitude !== null) {
    chips.push({ id: "lat", label: `lat:=${state.latitude}` });
  }
  if (state.longitude !== null) {
    chips.push({ id: "lng", label: `lng:=${state.longitude}` });
  }
  if (
    state.nearLatitude !== null &&
    state.nearLongitude !== null &&
    state.latitude === null &&
    state.longitude === null
  ) {
    chips.push({
      id: "near",
      label: `near:${state.nearLatitude},${state.nearLongitude}`,
    });
  }
  if (state.altitudeExact !== null) {
    chips.push({ id: "alt", label: `alt:${state.altitudeExact}` });
  } else if (state.altitudeMin !== null || state.altitudeMax !== null) {
    const min = state.altitudeMin ?? "";
    const max = state.altitudeMax ?? "";
    const token =
      state.altitudeMin !== null && state.altitudeMax !== null
        ? `alt:${min}..${max}`
        : state.altitudeMin !== null
          ? `alt:>${min}`
          : `alt:<${max}`;
    chips.push({ id: "alt", label: token });
  }
  if (state.sort !== "default") {
    const sortToken =
      state.sort === "distance-desc"
        ? "sort:-distance"
        : state.sort === "distance-asc"
          ? "sort:distance"
          : state.sort === "alt-desc"
            ? "sort:-alt"
            : state.sort === "alt-asc"
              ? "sort:alt"
              : state.sort === "id-desc"
                ? "sort:-id"
                : state.sort === "id-asc"
                  ? "sort:id"
                  : state.sort === "label-desc"
                    ? "sort:-label"
                    : state.sort === "label-asc"
                      ? "sort:label"
                      : `sort:${state.sort}`;
    chips.push({ id: "sort", label: sortToken });
  }
  return chips;
}

export function removeFilterChip(
  state: ControlPointsFilterState,
  chipId: string,
): ControlPointsFilterState {
  const draft = filterStateToDraft(state);
  draft.query = "";
  switch (chipId) {
    case "text":
      draft.text = "";
      break;
    case "label":
      draft.label = "";
      break;
    case "id":
      draft.id = "";
      break;
    case "lat":
      draft.latitude = "";
      break;
    case "lng":
      draft.longitude = "";
      break;
    case "alt":
      draft.altitude = "";
      break;
    case "near":
      draft.near = "";
      draft.latitude = "";
      draft.longitude = "";
      break;
    case "sort":
      draft.sort = "default";
      break;
    default:
      return state;
  }
  const query = buildQueryFromDraft(draft);
  return parseControlPointsFilterQuery(query);
}

function matchesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesAltitude(point: ControlPointRecord, state: ControlPointsFilterState): boolean {
  const altitude = point.altitudeM;
  if (state.altitudeExact !== null) {
    if (altitude === null) {
      return false;
    }
    return Math.abs(altitude - state.altitudeExact) < 0.5;
  }
  if (state.altitudeMin !== null) {
    if (altitude === null || altitude < state.altitudeMin) {
      return false;
    }
  }
  if (state.altitudeMax !== null) {
    if (altitude === null || altitude > state.altitudeMax) {
      return false;
    }
  }
  return true;
}

export function filterControlPoints(
  controlPoints: ControlPointRecord[],
  state: ControlPointsFilterState,
): ControlPointRecord[] {
  return controlPoints.filter((point) => {
    if (state.id !== null && point.id !== state.id) {
      return false;
    }
    if (state.label && !(point.label && matchesText(point.label, state.label))) {
      return false;
    }
    if (state.text) {
      const haystack = [
        point.label,
        point.poleNumber,
        point.description,
        String(point.id),
        point.latitude.toFixed(5),
        point.longitude.toFixed(5),
        point.altitudeM?.toFixed(1),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ");
      if (!matchesText(haystack, state.text)) {
        return false;
      }
    }
    if (state.latitude !== null && Math.abs(point.latitude - state.latitude) > COORD_TOLERANCE) {
      return false;
    }
    if (state.longitude !== null && Math.abs(point.longitude - state.longitude) > COORD_TOLERANCE) {
      return false;
    }
    if (!matchesAltitude(point, state)) {
      return false;
    }
    return true;
  });
}

function distanceToNear(point: ControlPointRecord, lat: number, lng: number): number {
  return haversineDistanceMeters(point.latitude, point.longitude, lat, lng);
}

export function sortControlPoints(
  controlPoints: ControlPointRecord[],
  state: ControlPointsFilterState,
): ControlPointRecord[] {
  const sorted = [...controlPoints];
  const nearLat = state.nearLatitude ?? state.latitude;
  const nearLng = state.nearLongitude ?? state.longitude;

  switch (state.sort) {
    case "distance-asc":
      if (nearLat === null || nearLng === null) {
        return sorted;
      }
      sorted.sort(
        (a, b) => distanceToNear(a, nearLat, nearLng) - distanceToNear(b, nearLat, nearLng),
      );
      return sorted;
    case "distance-desc":
      if (nearLat === null || nearLng === null) {
        return sorted;
      }
      sorted.sort(
        (a, b) => distanceToNear(b, nearLat, nearLng) - distanceToNear(a, nearLat, nearLng),
      );
      return sorted;
    case "alt-asc":
      sorted.sort(
        (a, b) =>
          (a.altitudeM ?? Number.POSITIVE_INFINITY) - (b.altitudeM ?? Number.POSITIVE_INFINITY),
      );
      return sorted;
    case "alt-desc":
      sorted.sort(
        (a, b) =>
          (b.altitudeM ?? Number.NEGATIVE_INFINITY) - (a.altitudeM ?? Number.POSITIVE_INFINITY),
      );
      return sorted;
    case "id-asc":
      sorted.sort((a, b) => a.id - b.id);
      return sorted;
    case "id-desc":
      sorted.sort((a, b) => b.id - a.id);
      return sorted;
    case "label-asc":
      sorted.sort((a, b) =>
        (a.label ?? a.poleNumber ?? "").localeCompare(b.label ?? b.poleNumber ?? ""),
      );
      return sorted;
    case "label-desc":
      sorted.sort((a, b) =>
        (b.label ?? b.poleNumber ?? "").localeCompare(a.label ?? a.poleNumber ?? ""),
      );
      return sorted;
    default:
      return sorted;
  }
}

export function applyControlPointsFilterQuery(
  controlPoints: ControlPointRecord[],
  query: string,
): { rows: ControlPointRecord[]; state: ControlPointsFilterState } {
  const state = parseControlPointsFilterQuery(query);
  const filtered = filterControlPoints(controlPoints, state);
  const rows = sortControlPoints(filtered, state);
  return { rows, state };
}

export type ControlPointsFilterDraft = {
  query: string;
  text: string;
  label: string;
  id: string;
  latitude: string;
  longitude: string;
  altitude: string;
  near: string;
  sort: ControlPointsSortMode;
};

export function filterStateToDraft(state: ControlPointsFilterState): ControlPointsFilterDraft {
  const useNearForDraft =
    state.nearLatitude !== null &&
    state.nearLongitude !== null &&
    state.latitude === null &&
    state.longitude === null;
  const near = useNearForDraft
    ? `${state.nearLatitude}, ${state.nearLongitude}`
    : state.nearLatitude !== null &&
        state.nearLongitude !== null &&
        (state.nearLatitude !== state.latitude || state.nearLongitude !== state.longitude)
      ? `${state.nearLatitude}, ${state.nearLongitude}`
      : "";
  let altitude = "";
  if (state.altitudeExact !== null) {
    altitude = String(state.altitudeExact);
  } else if (state.altitudeMin !== null && state.altitudeMax !== null) {
    altitude = `${state.altitudeMin}..${state.altitudeMax}`;
  } else if (state.altitudeMin !== null) {
    altitude = `>${state.altitudeMin}`;
  } else if (state.altitudeMax !== null) {
    altitude = `<${state.altitudeMax}`;
  }

  return {
    query: state.query,
    text: state.text ?? "",
    label: state.label ?? "",
    id: state.id !== null ? String(state.id) : "",
    latitude: state.latitude !== null ? String(state.latitude) : "",
    longitude: state.longitude !== null ? String(state.longitude) : "",
    altitude,
    near,
    sort: state.sort,
  };
}

export function buildQueryFromDraft(draft: ControlPointsFilterDraft): string {
  if (draft.query.trim()) {
    return draft.query.trim();
  }
  const tokens: string[] = [];
  if (draft.text.trim()) {
    tokens.push(draft.text.includes(" ") ? `q:"${draft.text.trim()}"` : draft.text.trim());
  }
  if (draft.label.trim()) {
    tokens.push(`label:"${draft.label.trim()}"`);
  }
  if (draft.id.trim()) {
    tokens.push(`id:${draft.id.trim()}`);
  }
  if (draft.near.trim()) {
    const parts = splitCoordinateParts(draft.near);
    if (parts.length >= 2) {
      tokens.push(`near:${parts[0]},${parts[1]}`);
    }
  } else if (draft.latitude.trim() && draft.longitude.trim()) {
    const isProximity =
      draft.sort === "distance-asc" || draft.sort === "distance-desc" || draft.sort === "default";
    if (isProximity) {
      tokens.push(`lat:${draft.latitude.trim()}`, `lng:${draft.longitude.trim()}`);
    } else {
      tokens.push(`lat:=${draft.latitude.trim()}`, `lng:=${draft.longitude.trim()}`);
    }
  }
  if (draft.altitude.trim()) {
    tokens.push(`alt:${draft.altitude.trim()}`);
  }
  if (draft.sort !== "default") {
    const sortToken =
      draft.sort === "distance-desc"
        ? "sort:-distance"
        : draft.sort === "distance-asc"
          ? "sort:distance"
          : draft.sort === "alt-desc"
            ? "sort:-alt"
            : draft.sort === "alt-asc"
              ? "sort:alt"
              : draft.sort === "id-desc"
                ? "sort:-id"
                : draft.sort === "id-asc"
                  ? "sort:id"
                  : draft.sort === "label-desc"
                    ? "sort:-label"
                    : draft.sort === "label-asc"
                      ? "sort:label"
                      : `sort:${draft.sort}`;
    tokens.push(sortToken);
  }
  return tokens.join(" ");
}

export function draftToFilterState(draft: ControlPointsFilterDraft): ControlPointsFilterState {
  const built = buildQueryFromDraft(draft);
  if (built) {
    return parseControlPointsFilterQuery(built);
  }
  return { ...EMPTY_CONTROL_POINTS_FILTER, sort: draft.sort };
}
