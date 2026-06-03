import {
  DEFAULT_MAPBOX_MENU_SYNC_STATE,
  type MapboxMenuSyncState,
} from "@shared/mapbox-menu.types.js";
import { createApplicationMenu } from "@main/menu/create-application-menu.js";

let mapboxMenuState: MapboxMenuSyncState = DEFAULT_MAPBOX_MENU_SYNC_STATE;

export function getMapboxMenuState(): MapboxMenuSyncState {
  return mapboxMenuState;
}

export function setMapboxMenuState(next: MapboxMenuSyncState): void {
  mapboxMenuState = next;
  createApplicationMenu();
}
