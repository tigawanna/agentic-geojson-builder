export type AppMenuNavigatePath = "/" | "/maps" | "/posts" | "/settings" | "/about";

export type AppMenuAction =
  | { type: "navigate"; path: AppMenuNavigatePath }
  | { type: "new-map-project" }
  | { type: "map-open"; mapId: number }
  | { type: "map-delete"; mapId: number; mapName: string }
  | { type: "check-updates" };

export type ShowMapContextMenuInput = {
  mapId: number;
  mapName: string;
};
