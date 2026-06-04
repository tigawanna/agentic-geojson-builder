export type MapboxCaptureTags = Record<string, string>;

export const MAPBOX_CAPTURE_DESCRIPTION_TAG = "description";

export type MapboxGroundCaptureRecord = {
  id: number;
  title: string;
  description: string | null;
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
  description?: string | null;
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
  description?: string | null;
  tags?: MapboxCaptureTags;
  elevation?: number | null;
  approved?: boolean;
};

export type DeleteMapboxGroundCaptureInput = {
  captureId: number;
};

export type MapboxCapturesChangedEvent = {
  reason: "created" | "updated" | "deleted";
  captureId?: number;
};
