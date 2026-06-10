import type { LanguageInfo } from '@src/interfaces';

export const getLanguageInfo = (): LanguageInfo => ({
  language: navigator.language,
  languages: navigator.languages,
});
