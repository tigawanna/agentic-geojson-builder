import type { MapBaseMapStyle } from "./maps.types.js";

export type PdfViewTransform = {
  scale: number;
  rotation: number;
  panX: number;
  panY: number;
};

export type MapCaptureOverlayInput = {
  controlPoints: Array<{ latitude: number; longitude: number }>;
  geoSegments: Array<{ geometry: { coordinates: Array<[number, number]> } }>;
  pendingMapPoint: { latitude: number; longitude: number } | null;
  pendingTracePoints: Array<{ latitude: number; longitude: number }>;
  baseMapStyle: MapBaseMapStyle;
};

export type RenderedMapViewPdfPane = {
  imageBase64: string;
  mimeType: "image/png";
  canvasWidth: number;
  canvasHeight: number;
  sourceDocumentWidth?: number;
  sourceDocumentHeight?: number;
  coordinateSpace: "pdf-pixels";
  origin: "top-left";
  pdfRenderScale: number;
  viewTransform: PdfViewTransform;
  note: string;
};

export type RenderedMapViewMapPane = {
  imageBase64: string;
  mimeType: "image/png";
  viewport: {
    center: { latitude: number; longitude: number };
    zoom: number;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  coordinateSpace: "wgs84";
  baseMapStyle: MapBaseMapStyle;
  containerWidth: number;
  containerHeight: number;
  captureMode: "dom-screenshot" | "tile-composite" | "schematic-overlays";
};

export type RenderedMapViewOverlays = {
  pendingMapPin: { latitude: number; longitude: number } | null;
  draftSegmentsDrawn: boolean;
};

export type RenderedMapView = {
  capturedAt: string;
  mapId: number;
  source: "client" | "server";
  pdfPane: RenderedMapViewPdfPane | null;
  mapPane: RenderedMapViewMapPane | null;
  controlPointsVisible: boolean;
  overlays: RenderedMapViewOverlays;
};

export type GetRenderedMapViewResult = {
  mapId: number;
  ready: boolean;
  reason: "no_client_snapshot" | "client_snapshot" | "live_capture";
  message?: string;
  capturedAt?: string;
  snapshot: RenderedMapView | null;
};

export type WorkspaceCaptureRequestEvent = {
  requestId: string;
  mapId: number;
};

export type WorkspaceCaptureResponseInput = {
  requestId: string;
  snapshot?: RenderedMapView;
  error?: string;
};

export type TileCacheCoverage = {
  hasTileCache: boolean;
  viewportFullyCovered: boolean;
  overlapPercent: number;
  cacheBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
};

export type SetMapViewportEvent = {
  requestId: string;
  mapId: number;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  fitBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};

export type SetMapViewportResponse = {
  requestId: string;
  viewport?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  error?: string;
};
