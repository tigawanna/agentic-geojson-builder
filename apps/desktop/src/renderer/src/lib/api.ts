import type { Api } from "@preload/index";

export function getApi(): Api | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.api ?? null;
}
