import karuraPgliteStash from "../../scripts/data/karura-pglite-stash.json";

export type StashedControlPoint = {
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  createdAt: string;
};

export type StashedMapWorkspace = {
  name: string;
  locationQuery: string;
  mapCenterLat: number;
  mapCenterLng: number;
  mapZoom: number;
  baseMapStyle: string;
  pdfScale: number;
  pdfRotation: number;
  pdfPanX: number;
  pdfPanY: number;
  pdfFileName: string;
  pdfPageCount: number;
};

export type PgliteDataStash = {
  sourceMapId: number;
  map: StashedMapWorkspace;
  controlPoints: StashedControlPoint[];
};

export const pgliteDataStash = karuraPgliteStash as PgliteDataStash;
