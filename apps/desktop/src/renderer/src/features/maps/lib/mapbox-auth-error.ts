const MAPBOX_STYLE_PROBE_URL = "https://api.mapbox.com/styles/v1/mapbox/streets-v12";

export class MapboxTokenValidationError extends Error {
  constructor() {
    super("MAPBOX_TOKEN_INVALID");
    this.name = "MapboxTokenValidationError";
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return String(error ?? "");
}

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return undefined;
}

export function isMapboxUnauthorizedError(error: unknown): boolean {
  const status = readErrorStatus(error);
  if (status === 401 || status === 403) {
    return true;
  }

  const message = readErrorMessage(error).toLowerCase();
  return (
    message.includes("not authorized") ||
    message.includes("invalid token") ||
    message.includes("invalid mapbox access token")
  );
}

export async function validateMapboxAccessToken(token: string): Promise<boolean> {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    return false;
  }

  try {
    const url = `${MAPBOX_STYLE_PROBE_URL}?access_token=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    if (response.status === 401 || response.status === 403) {
      return false;
    }
    return response.ok;
  } catch {
    return true;
  }
}

export function isMapboxTokenValidationError(error: unknown): error is MapboxTokenValidationError {
  return error instanceof MapboxTokenValidationError;
}
