import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import type { i18n as I18n } from "i18next";

export const i18n: I18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
