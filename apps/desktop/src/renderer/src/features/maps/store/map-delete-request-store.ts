import { create } from "zustand";

type MapDeleteRequest = {
  id: number;
  name: string;
};

type MapDeleteRequestState = {
  pending: MapDeleteRequest | null;
  request: (map: MapDeleteRequest) => void;
  clear: () => void;
};

export const useMapDeleteRequestStore = create<MapDeleteRequestState>((set) => ({
  pending: null,
  request: (map) => set({ pending: map }),
  clear: () => set({ pending: null }),
}));
