/**
 * This file is generated by generate-i18n.mjs
 * Do not edit this file directly
 */
import enMessage from '../locales/en/messages.json';
import hiMessage from '../locales/hi/messages.json';
import roMessage from '../locales/ro/messages.json';
import ruMessage from '../locales/ru/messages.json';
import ukMessage from '../locales/uk/messages.json';

export function getMessageFromLocale(locale: string) {
  switch (locale) {
    case 'en':
      return enMessage;
    case 'hi':
      return hiMessage;
    case 'ro':
      return roMessage;
    case 'ru':
      return ruMessage;
    case 'uk':
      return ukMessage;
    default:
      throw new Error('Unsupported locale');
  }
}

export const defaultLocale = (() => {
  const locales = ['en', 'hi', 'ro', 'ru', 'uk'];
  const firstLocale = locales[0];
  const defaultLocale = Intl.DateTimeFormat().resolvedOptions().locale.replace('-', '_');
  if (locales.includes(defaultLocale)) {
    return defaultLocale;
  }
  const defaultLocaleWithoutRegion = defaultLocale.split('_')[0];
  if (locales.includes(defaultLocaleWithoutRegion)) {
    return defaultLocaleWithoutRegion;
  }
  return firstLocale;
})();
