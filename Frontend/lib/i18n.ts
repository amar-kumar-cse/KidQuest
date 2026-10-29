import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

const LANGUAGE_STORAGE_KEY = 'kidquest_user_language_preference';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
};

export const fallbackLng = 'en';

export async function initI18n(): Promise<void> {
  let initialLanguage = fallbackLng;

  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi')) {
      initialLanguage = savedLanguage;
    } else {
      const locales = Localization.getLocales();
      const deviceLang = locales[0]?.languageCode;
      if (deviceLang === 'hi') {
        initialLanguage = 'hi';
      }
    }
  } catch (err) {
    console.warn('[i18n] Failed to load language preference:', err);
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng,
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });
}

export async function changeLanguage(lang: 'en' | 'hi'): Promise<void> {
  try {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    console.error('[i18n] Failed to change language:', err);
  }
}

// Initial fire
initI18n().catch(() => {});

export default i18n;

