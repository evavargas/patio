import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import esUY from "./locales/es-UY.json";

export const LANGUAGES = ["es-UY", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
const STORAGE_KEY = "patio-panel-language";

function isLanguage(v: string | null): v is Language {
  return LANGUAGES.some((l) => l === v);
}

function storedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(v)) return v;
  } catch {
    // almacenamiento bloqueado: se usa el idioma por defecto
  }
  return "es-UY";
}

// Las vistas nuevas solo agregan claves a los dos JSON de locales/.
void i18n.use(initReactI18next).init({
  resources: { "es-UY": { translation: esUY }, en: { translation: en } },
  lng: storedLanguage(),
  fallbackLng: "es-UY",
  interpolation: { escapeValue: false }, // React ya escapa; el texto se renderiza siempre plano
  initAsync: false,
});

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // la preferencia vale solo para esta sesion
  }
});
document.documentElement.lang = i18n.language;

export default i18n;
