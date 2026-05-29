export type PlaygroundGeoJsonFilePayload = {
  name: string;
  text: string;
};

export type PickPlaygroundGeoJsonFilesResult =
  | { canceled: true }
  | {
      canceled: false;
      files: PlaygroundGeoJsonFilePayload[];
      failed: Array<{ name: string; error: string }>;
    };

export type PlaygroundPersistedLayer = {
  id: string;
  name: string;
  text: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
};

export type PlaygroundListLayersResult = {
  layers: PlaygroundPersistedLayer[];
};

export type PlaygroundSaveLayerInput = {
  id: string;
  name: string;
  text: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
};

export type PlaygroundSaveLayerResult = {
  layer: Omit<PlaygroundPersistedLayer, "text">;
};

export type PlaygroundUpdateLayerInput = {
  id: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
};

export type PlaygroundUpdateLayerResult = {
  layer: Omit<PlaygroundPersistedLayer, "text"> | null;
};

export type PlaygroundDeleteLayerInput = {
  id: string;
};

export type PlaygroundDeleteLayerResult = {
  ok: boolean;
};
