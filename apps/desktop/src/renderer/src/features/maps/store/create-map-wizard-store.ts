import { create } from "zustand";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { TILE_CACHE_DEFAULT_MAX_ZOOM, TILE_CACHE_DEFAULT_MIN_ZOOM } from "@shared/tile-cache.types";

export type CreateMapWizardStep = "upload" | "details" | "cacheBounds" | "cacheBuilding";

type CreateMapWizardState = {
  isOpen: boolean;
  step: CreateMapWizardStep;
  file: File | null;
  name: string;
  description: string;
  locationQuery: string;
  latitude: string;
  longitude: string;
  cacheCorners: TileCacheCorner[];
  cacheStyle: MapBaseMapStyle;
  cacheMinZoom: number;
  cacheMaxZoom: number;
  buildProgress: { completed: number; total: number } | null;
  buildMessage: string | null;
};

type CreateMapWizardActions = {
  open: () => void;
  close: () => void;
  reset: () => void;
  setStep: (step: CreateMapWizardStep) => void;
  setFile: (file: File | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setLocationQuery: (locationQuery: string) => void;
  setLatitude: (latitude: string) => void;
  setLongitude: (longitude: string) => void;
  addCacheCorner: (corner: TileCacheCorner) => void;
  updateCacheCorner: (index: number, corner: TileCacheCorner) => void;
  resetCacheCorners: () => void;
  setCacheStyle: (style: MapBaseMapStyle) => void;
  setCacheZoomRange: (minZoom: number, maxZoom: number) => void;
  setBuildProgress: (progress: { completed: number; total: number } | null) => void;
  setBuildMessage: (message: string | null) => void;
};

const initialState: CreateMapWizardState = {
  isOpen: false,
  step: "upload",
  file: null,
  name: "",
  description: "",
  locationQuery: "",
  latitude: "",
  longitude: "",
  cacheCorners: [],
  cacheStyle: "standard",
  cacheMinZoom: TILE_CACHE_DEFAULT_MIN_ZOOM,
  cacheMaxZoom: TILE_CACHE_DEFAULT_MAX_ZOOM,
  buildProgress: null,
  buildMessage: null,
};

export const useCreateMapWizardStore = create<CreateMapWizardState & CreateMapWizardActions>(
  (set) => ({
    ...initialState,
    open: () => set({ ...initialState, isOpen: true }),
    close: () => set({ isOpen: false }),
    reset: () => set(initialState),
    setStep: (step) => set({ step }),
    setFile: (file) =>
      set({
        file,
        name:
          file?.name
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]+/g, " ")
            .trim() ?? "",
      }),
    setName: (name) => set({ name }),
    setDescription: (description) => set({ description }),
    setLocationQuery: (locationQuery) => set({ locationQuery }),
    setLatitude: (latitude) => set({ latitude }),
    setLongitude: (longitude) => set({ longitude }),
    addCacheCorner: (corner) =>
      set((state) => ({
        cacheCorners:
          state.cacheCorners.length >= 4 ? state.cacheCorners : [...state.cacheCorners, corner],
      })),
    updateCacheCorner: (index, corner) =>
      set((state) => ({
        cacheCorners: state.cacheCorners.map((item, itemIndex) =>
          itemIndex === index ? corner : item,
        ),
      })),
    resetCacheCorners: () => set({ cacheCorners: [] }),
    setCacheStyle: (cacheStyle) => set({ cacheStyle }),
    setCacheZoomRange: (cacheMinZoom, cacheMaxZoom) => set({ cacheMinZoom, cacheMaxZoom }),
    setBuildProgress: (buildProgress) => set({ buildProgress }),
    setBuildMessage: (buildMessage) => set({ buildMessage }),
  }),
);
