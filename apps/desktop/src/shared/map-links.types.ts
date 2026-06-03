export type MapLinkRecord = {
  id: number;
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction: number | null;
  endFraction: number | null;
  bidirectional: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMapLinkInput = {
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction?: number | null;
  endFraction?: number | null;
  bidirectional?: boolean;
};

export type CreateMapLinkFromPointsInput = {
  mapId: number;
  fromPointId: number;
  toPointId: number;
  pathSlug?: string;
  bidirectional?: boolean;
};

export type UpdateMapLinkInput = {
  mapId: number;
  linkId: number;
  pathSlug?: string;
  startFraction?: number | null;
  endFraction?: number | null;
  bidirectional?: boolean;
};

export type DeleteMapLinkInput = {
  mapId: number;
  linkId: number;
};

export type MapLinksChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted";
  linkId?: number;
};
