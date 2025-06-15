import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { I18N_FILE_PATH } from './consts.js';
import type { SupportedLanguagesKeysType, SupportedLanguagesWithoutRegionKeysType } from './types.js';

export default () => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.replace('-', '_') as SupportedLanguagesKeysType;
  const localeWithoutRegion = locale.split('_')[0] as SupportedLanguagesWithoutRegionKeysType;
  const localesDir = resolve(import.meta.dirname, '..', '..', 'locales');
  const implementedLocales = readdirSync(localesDir).filter(dir => lstatSync(resolve(localesDir, dir)).isDirectory());

  const pickLocale = (): string => {
    if (process.env.DEV_LOCALE) return process.env.DEV_LOCALE;
    if (implementedLocales.includes(locale)) return locale;
    if (implementedLocales.includes(localeWithoutRegion)) return localeWithoutRegion;
    return 'en';
  };

  const newImportLine = `import localeJSON from '../locales/${pickLocale()}/messages.json' with { type: 'json' };`;
  const lines = readFileSync(I18N_FILE_PATH, 'utf-8').split(/\r?\n/);
  const cleaned = lines.filter(line => !/^import\s+localeJSON/.test(line.trim()));

  let insertAt = 0;
  while (insertAt < cleaned.length && /^(['"])use\s+\w+['"];\s*$/.test(cleaned[insertAt].trim())) {
    insertAt += 1;
  }
  cleaned.splice(insertAt, 0, newImportLine);

  writeFileSync(I18N_FILE_PATH, `${cleaned.join('\n')}\n`, 'utf-8');
};
