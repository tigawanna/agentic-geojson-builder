export type AppMenuNavigatePath = "/" | "/maps" | "/posts" | "/settings" | "/about";

export type AppMenuAction =
  | { type: "navigate"; path: AppMenuNavigatePath }
  | { type: "new-map-project" }
  | { type: "map-open"; mapId: number }
  | { type: "check-updates" };

export type ShowMapContextMenuInput = {
  mapId: number;
  mapName: string;
};
