import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ro from './locales/ro.json';
import en from './locales/en.json';
import uk from './locales/uk.json';

const LANGUAGE_KEY = 'master-erp-language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
      uk: { translation: uk },
    },
    lng: window.localStorage.getItem(LANGUAGE_KEY) || 'ro',
    fallbackLng: 'ro',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (language) => {
  window.localStorage.setItem(LANGUAGE_KEY, language);
});

export default i18n;
