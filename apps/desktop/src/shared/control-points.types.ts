export type ControlPointRecord = {
  id: number;
  mapId: number;
  label: string | null;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  createdAt: string;
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
  label?: string | null;
};

export type DeleteControlPointInput = {
  mapId: number;
  controlPointId: number;
};

export type CreateControlPointFromViewportPixelsInput = {
  mapId: number;
  mapPaneX: number;
  mapPaneY: number;
  pdfPaneX: number;
  pdfPaneY: number;
  label?: string;
  liveCapture?: boolean;
};

export type ControlPointsChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted";
  controlPointId?: number;
};

export type MapPanePixelInput = {
  mapId: number;
  x: number;
  y: number;
  liveCapture?: boolean;
};

export type PdfPanePixelInput = {
  mapId: number;
  x: number;
  y: number;
  liveCapture?: boolean;
};

export type LonLatResult = {
  longitude: number;
  latitude: number;
};

export type ImagePixelResult = {
  imageX: number;
  imageY: number;
};
