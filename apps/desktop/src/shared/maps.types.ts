export type MapBaseMapStyle = "outline" | "standard" | "satellite";

export type MapListItem = {
  id: number;
  name: string;
  description: string | null;
  locationQuery: string | null;
  updatedAt: string;
};

export type MapWorkspaceState = {
  id: number;
  name: string;
  description: string | null;
  locationQuery: string;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number | null;
  baseMapStyle: MapBaseMapStyle;
  pdfScale: number;
  pdfRotation: number;
  pdfPanX: number;
  pdfPanY: number;
  pdfFileName: string | null;
  folderPath: string | null;
  pdfPageCount: number | null;
  hasSourceFile: boolean;
};

export type CreateMapInput = {
  name?: string;
};

export type CreateMapProjectInput = {
  name: string;
  description?: string;
  locationQuery?: string;
  mapCenterLat?: number;
  mapCenterLng?: number;
  fileName: string;
  mimeType: string;
  fileBase64: string;
};

export type MapSourceFilePayload = {
  fileName: string;
  mimeType: string;
  fileBase64: string;
};

export type MapsChangedEvent = {
  reason: "created" | "updated" | "deleted";
  mapId?: number;
};

export type UpdateMapWorkspaceInput = {
  mapId: number;
  locationQuery?: string;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  mapZoom?: number | null;
  baseMapStyle?: MapBaseMapStyle;
  pdfScale?: number;
  pdfRotation?: number;
  pdfPanX?: number;
  pdfPanY?: number;
};
