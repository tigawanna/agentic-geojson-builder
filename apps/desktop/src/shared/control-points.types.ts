export type ControlPointMetadata = Record<string, string>;

export type ControlPointContextSnapshot = {
  capturedAt: string;
  distanceMeters: number;
  source: {
    type: "geo_segment" | "reference_geojson";
    id: number | string;
    name: string | null;
    pathKind: string | null;
  };
  position: {
    latitude: number;
    longitude: number;
    altitudeM: number | null;
  };
  properties: Record<string, unknown>;
};

export type ControlPointRecord = {
  id: number;
  mapId: number;
  label: string | null;
  poleNumber: string | null;
  description: string | null;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  altitudeM: number | null;
  metadata: ControlPointMetadata;
  contextSnapshot: ControlPointContextSnapshot | null;
  sourceSegmentId: number | null;
  createdAt: string;
};

export type ControlPointAttachmentRecord = {
  id: number;
  controlPointId: number;
  filePath: string;
  mimeType: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export type CreateControlPointInput = {
  mapId: number;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  label?: string;
  poleNumber?: string;
  description?: string;
  altitudeM?: number;
  metadata?: ControlPointMetadata;
};

export type UpdateControlPointInput = {
  mapId: number;
  controlPointId: number;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  label?: string | null;
  poleNumber?: string | null;
  description?: string | null;
  altitudeM?: number | null;
  metadata?: ControlPointMetadata | null;
  contextSnapshot?: ControlPointContextSnapshot | null;
  sourceSegmentId?: number | null;
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

export type AddControlPointAttachmentInput = {
  controlPointId: number;
  filePath: string;
  mimeType: string;
  caption?: string;
};

export type RemoveControlPointAttachmentInput = {
  attachmentId: number;
};

export type ListControlPointAttachmentsInput = {
  controlPointId: number;
};
