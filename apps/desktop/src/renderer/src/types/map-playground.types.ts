import type { MapBaseMapStyle } from "@shared/maps.types";

export type PlaygroundCoordinate2D = [number, number];
export type PlaygroundCoordinate3D = [number, number, number];
export type PlaygroundCoordinate = PlaygroundCoordinate2D | PlaygroundCoordinate3D;

export type PlaygroundLineString = {
  type: "LineString";
  coordinates: PlaygroundCoordinate[];
};

export type PlaygroundFeature = {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: PlaygroundLineString;
};

export type PlaygroundFeatureCollection = {
  type: "FeatureCollection";
  features: PlaygroundFeature[];
};

export type PlaygroundLayer = {
  id: string;
  name: string;
  features: PlaygroundFeature[];
  visible: boolean;
  hiddenFeatureKeys: string[];
};

export type PlaygroundSelectedFeature = {
  layerId: string;
  featureKey: string;
};

export type PlaygroundElevationStats = {
  min: number | null;
  max: number | null;
  gain: number | null;
  loss: number | null;
  sampleCount: number;
};

export type PlaygroundTrailStats = {
  featureKey: string;
  name: string;
  slug: string | null;
  source: string | null;
  vertexCount: number;
  lengthMeters: number | null;
  elevation: PlaygroundElevationStats;
  trailforkId: number | null;
  trailforkUrl: string | null;
  difficulty: string | null;
  activityType: string | null;
  trailType: string | null;
  usage: string | null;
  direction: string | null;
  distanceMeters: number | null;
  altClimbMeters: number | null;
  altDescentMeters: number | null;
  avgTimeSeconds: number | null;
  popularityScore: number | null;
  globalRank: number | null;
  osmTags: Record<string, string>;
  sourceFiles: Record<string, unknown>;
  warnings: string[];
  properties: Record<string, unknown>;
};

export type PlaygroundBaseMapStyle = MapBaseMapStyle;
