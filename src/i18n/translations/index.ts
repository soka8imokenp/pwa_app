import { uzTranslations } from './uz';
import { enTranslations } from './en';
import { ruTranslations } from './ru';
import type { Language, TranslationDictionary } from '../types';

export const translations: Record<Language, TranslationDictionary> = {
  uz: uzTranslations,
  en: enTranslations,
  ru: ruTranslations,
};

export { uzTranslations, enTranslations, ruTranslations };
