import Store from "electron-store";
import type { StorageBackend } from "./types.js";

/**
 * Schema of the persisted settings. Extend freely — `electron-store` validates
 * at runtime and gives you TS autocompletion.
 */
export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: string;
  kv: Record<string, unknown>;
}

const store = new Store<AppSettings>({
  name: "app-settings",
  defaults: {
    theme: "system",
    language: "en",
    kv: {},
  },
});

export const backend: StorageBackend = {
  get(key) {
    return store.get(`kv.${key}` as keyof AppSettings);
  },
  set(key, value) {
    store.set(`kv.${key}` as keyof AppSettings, value);
  },
  delete(key) {
    store.delete(`kv.${key}` as keyof AppSettings);
  },
  clear() {
    store.clear();
  },
};

export { store as rawStore };
