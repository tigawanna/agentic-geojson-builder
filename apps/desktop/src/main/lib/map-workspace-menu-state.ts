import {
  DEFAULT_MAP_WORKSPACE_MENU_SYNC_STATE,
  type MapWorkspaceMenuSyncState,
} from "@shared/map-workspace-menu.types.js";
import { createApplicationMenu } from "@main/menu/create-application-menu.js";

let mapWorkspaceMenuState: MapWorkspaceMenuSyncState = DEFAULT_MAP_WORKSPACE_MENU_SYNC_STATE;

export function getMapWorkspaceMenuState(): MapWorkspaceMenuSyncState {
  return mapWorkspaceMenuState;
}

export function setMapWorkspaceMenuState(next: MapWorkspaceMenuSyncState): void {
  mapWorkspaceMenuState = next;
  createApplicationMenu();
}

export function patchMapWorkspaceMenuState(patch: Partial<MapWorkspaceMenuSyncState>): void {
  mapWorkspaceMenuState = { ...mapWorkspaceMenuState, ...patch };
  createApplicationMenu();
}
