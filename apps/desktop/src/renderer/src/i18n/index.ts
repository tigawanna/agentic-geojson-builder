import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
] as const;
