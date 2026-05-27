import { create } from "zustand";

export type CreateMapWizardStep = "upload" | "details" | "processing";

type CreateMapWizardState = {
  isOpen: boolean;
  step: CreateMapWizardStep;
  file: File | null;
  name: string;
  description: string;
  locationQuery: string;
  latitude: string;
  longitude: string;
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
  }),
);
