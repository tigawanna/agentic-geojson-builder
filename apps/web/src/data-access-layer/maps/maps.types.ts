export type MapBaseMapStyle = "outline" | "standard" | "satellite";

export type MapListItem = {
  id: number;
  name: string;
  pdfFileName: string | null;
  updatedAt: Date;
};

export type MapWorkspaceState = {
  id: number;
  name: string;
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
  pdfPageCount: number | null;
  hasPdf: boolean;
};

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
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
  pdfPageCount?: number | null;
  name?: string;
};

export type ListMapsInput = {
  keyword?: string;
  cursor?: string;
  direction?: "after" | "before";
};

export type SaveMapPdfInput = {
  mapId: number;
  fileName: string;
  pdfBase64: string;
  pageCount?: number | null;
};

export type MapPdfPayload = {
  fileName: string;
  pdfBase64: string;
};
