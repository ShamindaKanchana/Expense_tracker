import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

const STORAGE_KEY = 'expense_tracker_lang';
const SUPPORTED = ['en', 'si', 'ta'];

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  const browser = (navigator.language || 'en').toLowerCase();
  if (browser.startsWith('si')) return 'si';
  if (browser.startsWith('ta')) return 'ta';
  return 'en';
};

const applyDocumentLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng || 'en';
  }
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
    ta: { translation: ta }
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  },
  returnNull: false
});

applyDocumentLang(i18n.language);

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  applyDocumentLang(lng);
});

export { STORAGE_KEY, SUPPORTED };
export default i18n;
