export type GeoreferencePointError = {
  controlPointId: number;
  errorMeters: number;
};

export type GeoreferenceReadyViewModel = {
  mapId: number;
  ready: true;
  method: "affine";
  controlPointCount: number;
  residualErrorMeters: number;
  maxErrorMeters: number;
  computedAt: string;
  perPointErrors: GeoreferencePointError[];
};

export type GeoreferenceNotReadyViewModel = {
  mapId: number;
  ready: false;
  controlPointCount: number;
  reason: "insufficient_control_points" | "singular_transform";
};

export type GeoreferenceViewModel = GeoreferenceReadyViewModel | GeoreferenceNotReadyViewModel;

export type PdfPixelInput = {
  mapId: number;
  imageX: number;
  imageY: number;
};

export type LonLatInput = {
  mapId: number;
  longitude: number;
  latitude: number;
};

export type CoordinateConversionResult = {
  longitude: number;
  latitude: number;
};

export type PdfPixelConversionResult = {
  imageX: number;
  imageY: number;
};
