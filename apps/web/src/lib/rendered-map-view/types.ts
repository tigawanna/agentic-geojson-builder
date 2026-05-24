import type { GeoSegmentViewModel } from "@/data-access-layer/geo-segments/geo-segments.types";
import type { ControlPointViewModel } from "@/data-access-layer/control-points/control-points.types";
import type { BaseMapStyle } from "@/routes/_dashboard/maps/new/-components/map-handle";

export type PdfViewTransform = {
  scale: number;
  rotation: number;
  panX: number;
  panY: number;
};

export type RenderedMapViewPdfPane = {
  imageBase64: string;
  mimeType: "image/png";
  canvasWidth: number;
  canvasHeight: number;
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
  baseMapStyle: BaseMapStyle;
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

export type MapCaptureOverlayInput = {
  controlPoints: ControlPointViewModel[];
  geoSegments: GeoSegmentViewModel[];
  pendingMapPoint: { latitude: number; longitude: number } | null;
  pendingTracePoints: Array<{ latitude: number; longitude: number }>;
  baseMapStyle: BaseMapStyle;
};
