export type ControlPointViewModel = {
  id: number;
  mapId: number;
  label: string | null;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  createdAt: Date;
};

export type CreateControlPointInput = {
  mapId: number;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  label?: string;
};

export type UpdateControlPointInput = {
  mapId: number;
  controlPointId: number;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  silent?: boolean;
};

export type DeleteControlPointInput = {
  mapId: number;
  controlPointId: number;
};
