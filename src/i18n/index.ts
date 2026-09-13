import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ro from './locales/ro.json';
import en from './locales/en.json';
import it from './locales/it.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'master-erp-language';
const supportedLanguages = ['ro', 'en', 'it', 'fr'];
const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
const initialLanguage = savedLanguage && supportedLanguages.includes(savedLanguage) ? savedLanguage : 'ro';

if (savedLanguage && savedLanguage !== initialLanguage) {
  window.localStorage.setItem(LANGUAGE_KEY, initialLanguage);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
      it: { translation: it },
      fr: { translation: fr },
    },
    lng: initialLanguage,
    supportedLngs: supportedLanguages,
    fallbackLng: 'ro',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (language) => {
  window.localStorage.setItem(LANGUAGE_KEY, language);
});

export default i18n;
