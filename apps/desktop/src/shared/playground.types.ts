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
