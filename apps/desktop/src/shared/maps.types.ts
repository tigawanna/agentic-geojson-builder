export type MapListItem = {
  id: number;
  name: string;
  updatedAt: string;
};

export type CreateMapInput = {
  name?: string;
};

export type MapsChangedEvent = {
  reason: "created" | "updated" | "deleted";
  mapId?: number;
};
