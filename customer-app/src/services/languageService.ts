import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'en' | 'ta';

const LANGUAGE_KEY = '@ramyas_customer_language';

export const saveLanguagePreference = async (lang: SupportedLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
};

export const getLanguagePreference = async (): Promise<SupportedLanguage> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === 'ta' || saved === 'en') {
      return saved;
    }
  } catch (error) {
    console.error('Failed to read language preference:', error);
  }
  return 'en';
};

export const hasSavedLanguagePreference = async (): Promise<boolean> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return saved === 'ta' || saved === 'en';
  } catch {
    return false;
  }
};
