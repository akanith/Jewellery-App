import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SupportedLanguage,
  getLanguagePreference,
  saveLanguagePreference,
} from '@/services/languageService';
import { translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: TranslationKey) => translations.en[key] || key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLangState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    async function loadLang() {
      const saved = await getLanguagePreference();
      setLangState(saved);
    }
    loadLang();
  }, []);

  const setLanguage = async (newLang: SupportedLanguage) => {
    setLangState(newLang);
    await saveLanguagePreference(newLang);
  };

  const t = (key: TranslationKey): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
