import { useSyncExternalStore } from "react";
import {
  getMapboxTokenInvalid,
  subscribeMapboxTokenInvalid,
} from "@renderer/features/maps/lib/mapbox-token-invalid-store";

export function useMapboxTokenInvalid(): boolean {
  return useSyncExternalStore(subscribeMapboxTokenInvalid, getMapboxTokenInvalid, () => false);
}
