import type { LanguageInfo } from '@src/interfaces';

/** Returns user language and language preferences. */
export const getLanguageInfo = (): LanguageInfo => ({
  language: navigator.language,
  languages: navigator.languages,
});
