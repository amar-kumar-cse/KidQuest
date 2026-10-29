import { useTranslation } from 'react-i18next';
import { changeLanguage as setLang } from '../lib/i18n';
import * as Haptics from 'expo-haptics';

export function useLanguage() {
  const { t, i18n } = useTranslation();

  const currentLanguage = (i18n.language?.startsWith('hi') ? 'hi' : 'en') as 'en' | 'hi';

  const switchLanguage = async (newLang: 'en' | 'hi') => {
    if (newLang === currentLanguage) return;
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    await setLang(newLang);
  };

  return {
    t,
    language: currentLanguage,
    isHindi: currentLanguage === 'hi',
    isEnglish: currentLanguage === 'en',
    changeLanguage: switchLanguage,
  };
}

