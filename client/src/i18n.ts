import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector) // Cihaz dilini otonom algılar
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { "welcome": "Welcome", "crew": "Crew Members" } },
      tr: { translation: { "welcome": "Hoş Geldin", "crew": "Görevli Mürettebat" } }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });