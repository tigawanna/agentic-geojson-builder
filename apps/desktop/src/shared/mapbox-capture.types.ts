export type MapboxCaptureTags = Record<string, string>;

export type MapboxGroundCaptureRecord = {
  id: number;
  title: string;
  tags: MapboxCaptureTags;
  latitude: number;
  longitude: number;
  elevation: number | null;
  layerId: string | null;
  sourceLayer: string | null;
  baseMapStyle: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMapboxGroundCaptureInput = {
  title: string;
  tags?: MapboxCaptureTags;
  latitude: number;
  longitude: number;
  elevation?: number | null;
  layerId?: string | null;
  sourceLayer?: string | null;
  baseMapStyle?: string | null;
};

export type UpdateMapboxGroundCaptureInput = {
  captureId: number;
  title?: string;
  tags?: MapboxCaptureTags;
  approved?: boolean;
};

export type DeleteMapboxGroundCaptureInput = {
  captureId: number;
};

export type MapboxCapturesChangedEvent = {
  reason: "created" | "updated" | "deleted";
  captureId?: number;
};
