export type MarkerNeighborRecord = {
  id: number;
  mapId: number;
  fromMarkerId: number;
  toMarkerId: number;
  createdAt: string;
  updatedAt: string;
};

export type ReplaceMarkerNeighborsInput = {
  mapId: number;
  fromMarkerId: number;
  toMarkerIds: number[];
};

export type MarkerNeighborsChangedEvent = {
  mapId: number;
  reason: "replaced";
  fromMarkerId: number;
};
